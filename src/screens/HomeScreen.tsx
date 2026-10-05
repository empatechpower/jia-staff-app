import React, { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useT } from "../lib/i18n";
import { fmtTime, toDateKey } from "../lib/format";
import { colors } from "../lib/theme";
import { loadProjects } from "../lib/projects";
import { Card, SecondaryButton } from "../components/ui";
import type { RootStackParamList } from "../navigation";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;
type ProjectRow = { id: string; name: string; startTime: string; endTime: string };

export default function HomeScreen({ navigation }: Props) {
  const { t, lang, setLang } = useT();
  const { staffId, email, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<{ timesheetEntryId: string; clockedIn: string } | null>(null);
  const [projectRows, setProjectRows] = useState<ProjectRow[]>([]);
  const [activeProjectEntryId, setActiveProjectEntryId] = useState("");

  const firstName = email.split("@")[0].split(".")[0] || "";
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

      const [pRes, projects] = await Promise.all([api.hr.getProjectAttendance(open._id), loadProjects().catch(() => [])]);
      const names = new Map(projects.map((p) => [p.id, p.name]));
      const rows: any[] = (pRes as any)?.response?.results ?? [];
      const sorted = [...rows]
        .filter((r) => r.start_time)
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
      setActiveProjectEntryId(sorted.find((r) => !r.end_time)?._id ?? "");
      setProjectRows(
        sorted.map((r) => {
          const pid = typeof r.hr_project === "string" ? r.hr_project : r.hr_project?._id ?? "";
          return {
            id: r._id,
            name: names.get(pid) ?? pid,
            startTime: fmtTime(r.start_time),
            endTime: r.end_time ? fmtTime(r.end_time) : "",
          };
        }),
      );
    } catch {
      // keep what's on screen
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
      <View style={styles.topRow}>
        <Text style={styles.greeting}>{t("hello")} {displayName}.</Text>
        <Pressable onPress={() => setLang(lang === "en" ? "zh" : "en")} style={styles.langBtn}>
          <Text style={styles.langText}>{t("lang")}</Text>
        </Pressable>
      </View>

      <Card>
        {!active ? (
          <Tile title={t("startMyDay")} sub={t("clockInSub")} onPress={() => navigation.navigate("StartDay")} />
        ) : (
          <>
            <View style={styles.center2}>
              <Text style={styles.muted}>{t("startedAt")}</Text>
              <Text style={styles.bigTime}>{active.clockedIn}</Text>
            </View>
            <Pressable style={styles.primaryButton} onPress={endDay}>
              <Text style={styles.primaryButtonText}>{t("endMyDay")}</Text>
            </Pressable>

            {projectRows.length > 0 && (
              <View style={{ gap: 8 }}>
                <Text style={styles.sectionTitle}>{t("todayProjects")}</Text>
                {projectRows.map((r) => (
                  <View key={r.id} style={styles.projectRow}>
                    <Text style={styles.projectName} numberOfLines={1}>{r.name}</Text>
                    <Text style={styles.muted}>{r.startTime} – {r.endTime || t("ongoing")}</Text>
                  </View>
                ))}
              </View>
            )}

            <Tile
              title={activeProjectEntryId ? t("clockOutProject") : t("recordProject")}
              sub={activeProjectEntryId ? "" : ""}
              onPress={() => navigation.navigate("RecordProject", { timesheetEntryId: active.timesheetEntryId, staffId, activeProjectEntryId: activeProjectEntryId || undefined })}
            />
          </>
        )}
      </Card>

      <Card style={{ gap: 10 }}>
        <Tile title={t("myRecords")} sub={t("myRecordsSub")} onPress={() => navigation.navigate("MyRecords")} />
        <Tile title={t("leaveRequest")} sub={t("leaveRequestSub")} onPress={() => navigation.navigate("LeaveRequest")} />
        <Tile title={t("pettyCash")} sub={t("pettyCashSub")} onPress={() => navigation.navigate("PettyCash")} />
      </Card>

      <SecondaryButton label={t("signOut")} onPress={signOut} />
    </ScrollView>
  );
}

function Tile({ title, sub, onPress }: { title: string; sub: string; onPress: () => void }) {
  return (
    <Pressable style={styles.tile} onPress={onPress}>
      <Text style={styles.tileTitle}>{title}</Text>
      {!!sub && <Text style={styles.tileSub}>{sub}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 14 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  center2: { alignItems: "center", paddingVertical: 8 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  greeting: { fontSize: 22, fontWeight: "700", color: colors.text },
  langBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.card },
  langText: { fontSize: 12, color: colors.text, fontWeight: "600" },
  tile: { backgroundColor: colors.bg, borderRadius: 14, padding: 16 },
  tileTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
  tileSub: { fontSize: 13, color: colors.muted, marginTop: 4 },
  muted: { fontSize: 13, color: colors.muted },
  bigTime: { fontSize: 30, fontWeight: "700", color: colors.text, marginTop: 4 },
  primaryButton: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  primaryButtonText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: colors.text },
  projectRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.bg, borderRadius: 10, padding: 12 },
  projectName: { fontSize: 14, fontWeight: "500", color: colors.text, flex: 1, marginRight: 8 },
});
