import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useT } from "../lib/i18n";
import { fmtTime, toDateKey } from "../lib/format";
import { loadProjects } from "../lib/projects";
import { Card, Chip } from "../components/ui";
import { colors } from "../lib/theme";

type DayRecord = {
  entryId: string;
  dateKey: string;
  startTime: string;
  endTime: string;
  hours: number;
  ot: number;
  earned: number;
};

type ProjectLine = { name: string; start: string; end: string };

function dayLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-SG", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export default function MyRecordsScreen() {
  const { t } = useT();
  const { staffId } = useAuth();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [records, setRecords] = useState<DayRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [projectsByEntry, setProjectsByEntry] = useState<Record<string, ProjectLine[]>>({});
  const [projectNames, setProjectNames] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    loadProjects().then((ps) => setProjectNames(new Map(ps.map((p) => [p.id, p.name])))).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    if (!staffId) return;
    setLoading(true);
    try {
      const res: any = await api.hr.getStaffTimesheet(staffId, month + 1, year);
      const rows: any[] = res?.response?.results ?? [];
      const mapped: DayRecord[] = rows
        .map((e) => ({
          entryId: e._id ?? "",
          dateKey: toDateKey(e.clock_in_time),
          startTime: fmtTime(e.clock_in_time),
          endTime: fmtTime(e.clock_out_time),
          hours: Number(e.hoursWorked ?? e.hours_worked ?? 0),
          ot: Number(e.otHours ?? e.ot_hours ?? 0),
          earned: Number(e.total_salary_day ?? 0),
        }))
        .filter((r) => r.dateKey)
        .sort((a, b) => b.dateKey.localeCompare(a.dateKey));
      setRecords(mapped);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [staffId, month, year]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggle(entryId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(entryId) ? next.delete(entryId) : next.add(entryId);
      return next;
    });
    if (projectsByEntry[entryId]) return;
    try {
      const res: any = await api.hr.getProjectAttendance(entryId);
      const rows: any[] = res?.response?.results ?? [];
      const lines = rows.map((r) => {
        const pid = typeof r.hr_project === "string" ? r.hr_project : r.hr_project?._id ?? "";
        return { name: projectNames.get(pid) ?? r.hr_project?.name ?? "Unknown", start: fmtTime(r.start_time), end: fmtTime(r.end_time) };
      });
      setProjectsByEntry((prev) => ({ ...prev, [entryId]: lines }));
    } catch {
      setProjectsByEntry((prev) => ({ ...prev, [entryId]: [] }));
    }
  }

  function shiftMonth(delta: number) {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Card>
        <View style={styles.monthRow}>
          <Pressable onPress={() => shiftMonth(-1)} style={styles.navBtn}><Text style={styles.navText}>‹</Text></Pressable>
          <Text style={styles.monthLabel}>{t(`m${month}` as any)} {year}</Text>
          <Pressable onPress={() => shiftMonth(1)} style={styles.navBtn}><Text style={styles.navText}>›</Text></Pressable>
        </View>
      </Card>

      {loading && <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />}
      {!loading && records.length === 0 && (
        <Card><Text style={styles.muted}>{t("noRecords")}</Text></Card>
      )}

      {!loading && records.map((r) => {
        const open = expanded.has(r.entryId);
        const lines = projectsByEntry[r.entryId];
        return (
          <Card key={r.entryId} style={{ padding: 0, overflow: "hidden" }}>
            <Pressable onPress={() => toggle(r.entryId)} style={styles.dayHeader}>
              <Text style={styles.dayTitle}>{dayLabel(r.dateKey)}</Text>
              <Text style={styles.chevron}>{open ? "▲" : "▼"}</Text>
            </Pressable>
            {open && (
              <View style={styles.dayBody}>
                <View style={styles.statRow}>
                  <Stat label={t("colStart")} value={r.startTime} />
                  <Stat label={t("colEnd")} value={r.endTime} />
                  <Stat label={t("colHours")} value={String(r.hours)} />
                  <Stat label={t("colOT")} value={String(r.ot)} />
                  <Stat label={t("colEarned")} value={`$${r.earned.toFixed(2)}`} />
                </View>
                <Text style={styles.subhead}>{t("colProject")}</Text>
                {!lines && <ActivityIndicator color={colors.primary} />}
                {lines && lines.length === 0 && <Text style={styles.muted}>—</Text>}
                {lines?.map((l, i) => (
                  <View key={i} style={styles.projectLine}>
                    <Text style={styles.projectName} numberOfLines={1}>{l.name}</Text>
                    <Text style={styles.muted}>{l.start} – {l.end || t("ongoing")}</Text>
                  </View>
                ))}
              </View>
            )}
          </Card>
        );
      })}
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 12 },
  monthRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  monthLabel: { fontSize: 16, fontWeight: "700", color: colors.text },
  navBtn: { paddingHorizontal: 14, paddingVertical: 4 },
  navText: { fontSize: 24, color: colors.primary, fontWeight: "600" },
  muted: { fontSize: 13, color: colors.muted },
  dayHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16 },
  dayTitle: { fontSize: 14, fontWeight: "600", color: colors.text },
  chevron: { color: colors.muted, fontSize: 12 },
  dayBody: { borderTopWidth: 1, borderTopColor: colors.border, padding: 16, gap: 10 },
  statRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  stat: { minWidth: "40%", gap: 2 },
  statLabel: { fontSize: 11, color: colors.muted },
  statValue: { fontSize: 14, color: colors.text, fontWeight: "600" },
  subhead: { fontSize: 12, fontWeight: "700", color: colors.text, marginTop: 4 },
  projectLine: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.bg, borderRadius: 10, padding: 10 },
  projectName: { fontSize: 14, color: colors.text, flex: 1, marginRight: 8 },
});
