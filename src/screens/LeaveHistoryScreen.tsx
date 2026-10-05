import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../lib/auth";
import { useT } from "../lib/i18n";
import { colors } from "../lib/theme";
import { Card, Chip } from "../components/ui";
import { loadLeaveHistory, type LeaveRecord, type DayType } from "../lib/leave";

const STATUS_COLOR: Record<LeaveRecord["status"], string> = {
  approved: colors.success,
  rejected: colors.danger,
  pending: colors.muted,
  cancelled: colors.muted,
};

export default function LeaveHistoryScreen() {
  const { t } = useT();
  const { staffId } = useAuth();
  const [records, setRecords] = useState<LeaveRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState("All");
  const [year, setYear] = useState<number | "All">("All");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!staffId) return;
    loadLeaveHistory(staffId).then(setRecords).catch(() => setRecords([])).finally(() => setLoading(false));
  }, [staffId]);

  const years = Array.from(new Set(records.map((r) => r.year).filter((y) => y > 0))).sort((a, b) => b - a);
  const filtered = records
    .filter((r) => (month === "All" || r.month === month) && (year === "All" || r.year === year))
    .sort((a, b) => b.from.localeCompare(a.from));

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const dayTypeLabel = (d: DayType) => (d === "am" ? t("amHalf") : d === "pm" ? t("pmHalf") : t("fullDay"));

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.label}>{t("year")}</Text>
        <View style={styles.chips}>
          <Chip label={t("all")} selected={year === "All"} onPress={() => setYear("All")} />
          {years.map((y) => <Chip key={y} label={String(y)} selected={year === y} onPress={() => setYear(y)} />)}
        </View>
        <Text style={styles.label}>{t("month")}</Text>
        <View style={styles.chips}>
          <Chip label={t("all")} selected={month === "All"} onPress={() => setMonth("All")} />
          {["January","February","March","April","May","June","July","August","September","October","November","December"].map((m) => (
            <Chip key={m} label={m.slice(0, 3)} selected={month === m} onPress={() => setMonth(m)} />
          ))}
        </View>
      </Card>

      {loading && <ActivityIndicator color={colors.primary} />}
      {!loading && filtered.length === 0 && <Card><Text style={styles.muted}>—</Text></Card>}

      {!loading && filtered.map((r) => {
        const open = expanded.has(r.id);
        const single = r.from === r.to;
        const daysLabel = `${r.days} ${r.days === 1 ? t("day") : t("days")}`;
        const dayLabel = single
          ? (r.startDayType === "full" ? daysLabel : dayTypeLabel(r.startDayType))
          : (r.startDayType === "full" && r.endDayType === "full")
            ? daysLabel
            : `${daysLabel} (${dayTypeLabel(r.startDayType)} → ${dayTypeLabel(r.endDayType)})`;
        return (
          <Card key={r.id} style={{ padding: 0, overflow: "hidden" }}>
            <Pressable onPress={() => toggle(r.id)} style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{r.leaveType}</Text>
                <Text style={styles.muted}>{dayLabel} · {r.from}</Text>
              </View>
              <Text style={[styles.status, { color: STATUS_COLOR[r.status] }]}>{t(r.status)}</Text>
            </Pressable>
            {open && (
              <View style={styles.body}>
                <Text style={styles.muted}>{t("colFrom")}: {r.from}</Text>
                <Text style={styles.muted}>{t("colTo")}: {r.to}</Text>
                <Text style={styles.muted}>{t("colDays")}: {dayLabel}</Text>
                {!!r.reason && <Text style={styles.muted}>{t("colReason")}: {r.reason}</Text>}
              </View>
            )}
          </Card>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 12 },
  label: { fontSize: 12, fontWeight: "600", color: colors.text },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 6 },
  header: { flexDirection: "row", alignItems: "center", padding: 16, gap: 8 },
  title: { fontSize: 14, fontWeight: "600", color: colors.text },
  status: { fontSize: 12, fontWeight: "600" },
  body: { borderTopWidth: 1, borderTopColor: colors.border, padding: 16, gap: 6 },
  muted: { fontSize: 13, color: colors.muted },
});
