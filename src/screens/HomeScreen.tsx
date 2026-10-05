import React, { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { fmtTime, toDateKey } from "../lib/format";
import { colors } from "../lib/theme";
import { loadProjects } from "../lib/projects";

import type { RootStackParamList as RootParams } from "../navigation";

type ProjectRow = { id: string; name: string; startTime: string; endTime: string; active: boolean };

export default function HomeScreen({ navigation }: NativeStackScreenProps<RootParams, "Home">) {
  const { staffId, email, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<{ timesheetEntryId: string; clockedIn: string } | null>(null);
  const [projectRows, setProjectRows] = useState<ProjectRow[]>([]);
  const [activeProjectEntryId, setActiveProjectEntryId] = useState("");

  const firstName = (email.split("@")[0].split(".")[0] || "there");
  const displayName = firstName.charAt(0).toUpperCase() + firstName.slice(1);

  const load = useCallback(async () => {
    if (!staffId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const todayKey = toDateKey(Date.now());
      const tRes: any = await api.hr.getTodayTimesheet(staffId);
      const entries: any[] = tRes?.response?.results ?? [];
      const open = entries.find((e) => e.clock_in_time && !e.clock_out_time && toDateKey(e.clock_in_time) === todayKey);
      if (!open) {
        setActive(null);
        setProjectRows([]);
        setActiveProjectEntryId("");
        return;
      }
      setActive({ timesheetEntryId: open._id, clockedIn: fmtTime(open.clock_in_time) });

      const [pRes, projects] = await Promise.all([
        api.hr.getProjectAttendance(open._id),
        loadProjects().catch(() => []),
      ]);
      const names = new Map(projects.map((p) => [p.id, p.name]));
      const rows: any[] = (pRes as any)?.response?.results ?? [];
      const sorted = [...rows]
        .filter((r) => r.start_time)
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
      const open2 = sorted.find((r) => !r.end_time);
      setActiveProjectEntryId(open2?._id ?? "");
      setProjectRows(
        sorted.map((r) => {
          const projId = typeof r.hr_project === "string" ? r.hr_project : r.hr_project?._id ?? "";
          return {
            id: r._id,
            name: names.get(projId) ?? projId,
            startTime: fmtTime(r.start_time),
            endTime: r.end_time ? fmtTime(r.end_time) : "",
            active: !r.end_time,
          };
        }),
      );
    } catch {
      // leave whatever is on screen; pull-to-refresh isn't wired yet
    } finally {
      setLoading(false);
    }
  }, [staffId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function endDay() {
    if (!active) return;
    await api.hr.clockOut({ timesheet_entry_id: active.timesheetEntryId, clock_out_time: new Date().toISOString() });
    load();
  }

  if (loading && !active) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.greeting}>Hello {displayName}.</Text>

        {!active ? (
          <Pressable style={styles.tile} onPress={() => navigation.navigate("StartDay")}>
            <Text style={styles.tileTitle}>Start My Day</Text>
            <Text style={styles.tileSub}>Clock in your attendance here.</Text>
          </Pressable>
        ) : (
          <>
            <View style={styles.center2}>
              <Text style={styles.muted}>Started my day at:</Text>
              <Text style={styles.bigTime}>{active.clockedIn}</Text>
            </View>

            <Pressable style={styles.primaryButton} onPress={endDay}>
              <Text style={styles.primaryButtonText}>End My Day</Text>
            </Pressable>

            {projectRows.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Today's Project Time</Text>
                {projectRows.map((r) => (
                  <View key={r.id} style={styles.projectRow}>
                    <Text style={styles.projectName} numberOfLines={1}>{r.name}</Text>
                    <Text style={styles.muted}>{r.startTime} – {r.endTime || "Ongoing"}</Text>
                  </View>
                ))}
              </View>
            )}

            <Pressable
              style={styles.tile}
              onPress={() =>
                navigation.navigate("RecordProject", {
                  timesheetEntryId: active.timesheetEntryId,
                  staffId,
                  activeProjectEntryId: activeProjectEntryId || undefined,
                })
              }
            >
              <Text style={styles.tileTitle}>
                {activeProjectEntryId ? "Clock Out Project" : "Record Project Attendance"}
              </Text>
              <Text style={styles.tileSub}>
                {activeProjectEntryId ? "Tap to clock out of your current project." : "Clock in to a project."}
              </Text>
            </Pressable>
          </>
        )}
      </View>

      <Pressable style={styles.signOut} onPress={signOut}>
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  center2: { alignItems: "center", paddingVertical: 12 },
  card: { backgroundColor: colors.card, borderRadius: 16, padding: 18, gap: 14 },
  greeting: { fontSize: 22, fontWeight: "700", color: colors.text },
  tile: { backgroundColor: colors.bg, borderRadius: 14, padding: 16 },
  tileTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
  tileSub: { fontSize: 13, color: colors.muted, marginTop: 4 },
  muted: { fontSize: 13, color: colors.muted },
  bigTime: { fontSize: 30, fontWeight: "700", color: colors.text, marginTop: 4 },
  primaryButton: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  primaryButtonText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  section: { gap: 8 },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: colors.text },
  projectRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.bg, borderRadius: 10, padding: 12 },
  projectName: { fontSize: 14, fontWeight: "500", color: colors.text, flex: 1, marginRight: 8 },
  signOut: { alignItems: "center", padding: 12 },
  signOutText: { color: colors.muted, fontSize: 14 },
});
