import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as Location from "expo-location";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { fmtTime } from "../lib/format";
import { colors } from "../lib/theme";
import { useT } from "../lib/i18n";
import { loadProjects, type Project } from "../lib/projects";
import { distanceInMeters, isWithinRadius, nearestDistance, OFFICE_LOCATION, GEOFENCE_RADIUS_METERS, type LatLng } from "../lib/geo";

const LOCATIONS = ["On Site", "Office", "WFH"] as const;
type Location_ = (typeof LOCATIONS)[number];
const LOC_KEY = { "On Site": "loc_onsite", "Office": "loc_office", "WFH": "loc_wfh" } as const;

import type { RootStackParamList as RootParams } from "../navigation";

type GpsState = { status: "requesting" | "obtained" | "denied"; coords: LatLng | null };

export default function StartDayScreen({ navigation }: NativeStackScreenProps<RootParams, "StartDay">) {
  const { staffId } = useAuth();
  const { t } = useT();
  const [location, setLocation] = useState<Location_>("On Site");
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState("");
  const [gps, setGps] = useState<GpsState>({ status: "requesting", coords: null });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [startTime] = useState(() => fmtTime(Date.now()));

  useEffect(() => {
    loadProjects().then(setProjects).catch(() => {});
    (async () => {
      try {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (perm.status !== "granted") {
          setGps({ status: "denied", coords: null });
          return;
        }
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        setGps({ status: "obtained", coords: { lat: pos.coords.latitude, lng: pos.coords.longitude } });
      } catch {
        setGps({ status: "denied", coords: null });
      }
    })();
  }, []);

  const selectedProject = projects.find((p) => p.id === projectId) ?? null;
  const isOffice = location === "Office";
  const isOnSite = location === "On Site";

  // Office checks one fixed point; On Site checks the nearest of the project's saved sites.
  const targets: LatLng[] = useMemo(() => {
    if (isOffice) return [OFFICE_LOCATION];
    if (isOnSite && selectedProject) return selectedProject.sites;
    return [];
  }, [isOffice, isOnSite, selectedProject]);

  const distance = gps.coords ? nearestDistance(gps.coords, targets) : null;
  const geofenced = isOffice || isOnSite;

  let blockReason = "";
  if (geofenced && gps.status !== "obtained") blockReason = t("gpsRequired");
  else if (isOnSite && !projectId) blockReason = t("selectProjectFirst");
  else if (isOnSite && selectedProject && selectedProject.sites.length === 0)
    blockReason = t("noSiteSaved");
  else if (geofenced && distance !== null && !isWithinRadius(distance))
    blockReason = `${Math.round(distance)}m · ${t("mustBeWithin")} ${GEOFENCE_RADIUS_METERS}m`;
  const canClockIn = !submitting && blockReason === "";

  async function clockIn() {
    if (!canClockIn) return;
    setSubmitting(true);
    setError("");
    try {
      await api.hr.clockIn({
        staff_id: staffId,
        location_type: location,
        latitude: gps.coords?.lat,
        longitude: gps.coords?.lng,
        clock_in_time: new Date().toISOString(),
        ...(isOnSite && projectId ? { hr_project_id: projectId } : {}),
      });
      navigation.goBack();
    } catch (e: any) {
      setError(e?.message ?? t("submitError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>{t("startMyDay")}</Text>

        <Text style={styles.label}>{t("location")}</Text>
        <View style={styles.chipRow}>
          {LOCATIONS.map((l) => (
            <Chip key={l} label={t(LOC_KEY[l])} selected={location === l} onPress={() => setLocation(l)} />
          ))}
        </View>

        {isOnSite && (
          <>
            <Text style={styles.label}>{t("project")} <Text style={styles.required}>*</Text></Text>
            <View style={styles.chipRow}>
              {projects.map((p) => (
                <Chip key={p.id} label={p.name} selected={projectId === p.id} onPress={() => setProjectId(p.id)} />
              ))}
            </View>
          </>
        )}

        <View style={styles.gpsBox}>
          {gps.status === "requesting" && <Text style={styles.muted}>{t("detecting")}</Text>}
          {gps.status === "denied" && <Text style={styles.danger}>{t("gpsDenied")}</Text>}
          {gps.status === "obtained" && geofenced && distance !== null && (
            <Text style={isWithinRadius(distance) ? styles.success : styles.danger}>
              {isWithinRadius(distance)
                ? `${t("withinRange")} — ${Math.round(distance)}m.`
                : `${Math.round(distance)}m · ${t("mustBeWithin")} ${GEOFENCE_RADIUS_METERS}m.`}
            </Text>
          )}
          {gps.status === "obtained" && !geofenced && <Text style={styles.muted}>{t("locationRecorded")}</Text>}
        </View>

        {!!blockReason && <Text style={styles.danger}>{blockReason}</Text>}
        {!!error && <Text style={styles.danger}>{error}</Text>}

        <View style={styles.footer}>
          <View>
            <Text style={styles.muted}>{t("startTime")}</Text>
            <Text style={styles.bigTime}>{startTime}</Text>
          </View>
          <Pressable
            style={[styles.primaryButton, !canClockIn && styles.disabled]}
            onPress={clockIn}
            disabled={!canClockIn}
          >
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>{t("startDayBtn")}</Text>}
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16 },
  card: { backgroundColor: colors.card, borderRadius: 16, padding: 18, gap: 12 },
  title: { fontSize: 20, fontWeight: "700", color: colors.text },
  label: { fontSize: 12, fontWeight: "600", color: colors.text, marginTop: 4 },
  required: { color: colors.danger },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, color: colors.text },
  chipTextSelected: { color: "#fff", fontWeight: "600" },
  gpsBox: { minHeight: 20 },
  muted: { fontSize: 13, color: colors.muted },
  danger: { fontSize: 13, color: colors.danger },
  success: { fontSize: 13, color: colors.success },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 8 },
  bigTime: { fontSize: 26, fontWeight: "700", color: colors.text },
  primaryButton: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 24, minWidth: 120, alignItems: "center" },
  primaryButtonText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  disabled: { opacity: 0.5 },
});
