import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as Location from "expo-location";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { fmtTime } from "../lib/format";
import { colors } from "../lib/theme";
import { loadProjects, type Project } from "../lib/projects";
import { distanceInMeters, isWithinRadius, nearestDistance, OFFICE_LOCATION, GEOFENCE_RADIUS_METERS, type LatLng } from "../lib/geo";

const LOCATIONS = ["On Site", "Office", "WFH"] as const;
type Location_ = (typeof LOCATIONS)[number];

import type { RootStackParamList as RootParams } from "../navigation";

type GpsState = { status: "requesting" | "obtained" | "denied"; coords: LatLng | null };

export default function StartDayScreen({ navigation }: NativeStackScreenProps<RootParams, "StartDay">) {
  const { staffId } = useAuth();
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
  if (geofenced && gps.status !== "obtained") blockReason = "Location is required to clock in here.";
  else if (isOnSite && !projectId) blockReason = "Select a project first.";
  else if (isOnSite && selectedProject && selectedProject.sites.length === 0)
    blockReason = "This project has no site location saved.";
  else if (geofenced && distance !== null && !isWithinRadius(distance))
    blockReason = `You're ${Math.round(distance)}m away — must be within ${GEOFENCE_RADIUS_METERS}m.`;
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
      setError(e?.message ?? "Could not clock in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>Start My Day</Text>

        <Text style={styles.label}>Location</Text>
        <View style={styles.chipRow}>
          {LOCATIONS.map((l) => (
            <Chip key={l} label={l} selected={location === l} onPress={() => setLocation(l)} />
          ))}
        </View>

        {isOnSite && (
          <>
            <Text style={styles.label}>Project <Text style={styles.required}>*</Text></Text>
            <View style={styles.chipRow}>
              {projects.map((p) => (
                <Chip key={p.id} label={p.name} selected={projectId === p.id} onPress={() => setProjectId(p.id)} />
              ))}
            </View>
          </>
        )}

        <View style={styles.gpsBox}>
          {gps.status === "requesting" && <Text style={styles.muted}>Detecting location…</Text>}
          {gps.status === "denied" && <Text style={styles.danger}>Location access denied.</Text>}
          {gps.status === "obtained" && geofenced && distance !== null && (
            <Text style={isWithinRadius(distance) ? styles.success : styles.danger}>
              {isWithinRadius(distance)
                ? `Within range — ${Math.round(distance)}m.`
                : `${Math.round(distance)}m away — must be within ${GEOFENCE_RADIUS_METERS}m.`}
            </Text>
          )}
          {gps.status === "obtained" && !geofenced && <Text style={styles.muted}>Location recorded.</Text>}
        </View>

        {!!blockReason && <Text style={styles.danger}>{blockReason}</Text>}
        {!!error && <Text style={styles.danger}>{error}</Text>}

        <View style={styles.footer}>
          <View>
            <Text style={styles.muted}>Start time</Text>
            <Text style={styles.bigTime}>{startTime}</Text>
          </View>
          <Pressable
            style={[styles.primaryButton, !canClockIn && styles.disabled]}
            onPress={clockIn}
            disabled={!canClockIn}
          >
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Clock In</Text>}
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
