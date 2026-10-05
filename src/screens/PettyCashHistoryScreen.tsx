import React, { useCallback, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "../lib/auth";
import { useT } from "../lib/i18n";
import { colors } from "../lib/theme";
import { Card, Chip, SecondaryButton } from "../components/ui";
import { loadClaims, formatTotals, type Claim, type PettyStatus } from "../lib/petty";
import type { RootStackParamList } from "../navigation";

type Props = NativeStackScreenProps<RootStackParamList, "PettyCashHistory">;

const STATUS_COLOR: Record<PettyStatus, string> = {
  approved: colors.success,
  rejected: colors.danger,
  pending: colors.muted,
};

export default function PettyCashHistoryScreen({ navigation }: Props) {
  const { t } = useT();
  const { staffId } = useAuth();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState("All");
  const [year, setYear] = useState<number | "All">("All");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Reloads every time the screen comes back into focus, so an edit shows up immediately.
  useFocusEffect(
    useCallback(() => {
      if (!staffId) return;
      setLoading(true);
      loadClaims(staffId).then(setClaims).catch(() => setClaims([])).finally(() => setLoading(false));
    }, [staffId]),
  );

  const years = Array.from(new Set(claims.map((c) => c.year).filter((y) => y > 0))).sort((a, b) => b - a);
  const filtered = claims.filter((c) => (month === "All" || c.month === month) && (year === "All" || c.year === year));
  const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date));

  const tiles: { label: string; list: Claim[]; color: string }[] = [
    { label: t("pcTotalClaimed"), list: filtered, color: colors.text },
    { label: t("pending"), list: filtered.filter((c) => c.status === "pending"), color: colors.muted },
    { label: t("approved"), list: filtered.filter((c) => c.status === "approved"), color: colors.success },
    { label: t("rejected"), list: filtered.filter((c) => c.status === "rejected"), color: colors.danger },
  ];

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.grid}>
        {tiles.map((tile) => (
          <Card key={tile.label} style={styles.tile}>
            <Text style={styles.tileLabel}>{tile.label}</Text>
            <Text style={[styles.tileValue, { color: tile.color }]}>{formatTotals(tile.list)}</Text>
            <Text style={styles.tileCount}>{tile.list.length} {tile.list.length === 1 ? t("claim") : t("claims")}</Text>
          </Card>
        ))}
      </View>

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
      {!loading && sorted.length === 0 && <Card><Text style={styles.muted}>{t("pcNoClaims")}</Text></Card>}

      {!loading && sorted.map((c) => {
        const open = expanded.has(c.id);
        return (
          <Card key={c.id} style={{ padding: 0, overflow: "hidden" }}>
            <Pressable onPress={() => toggle(c.id)} style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title} numberOfLines={1}>{c.supplier || "—"}</Text>
                <Text style={styles.muted}>{c.currency} {c.amount.toFixed(2)} · {c.date}</Text>
              </View>
              <Text style={[styles.status, { color: STATUS_COLOR[c.status] }]}>{t(c.status)}</Text>
            </Pressable>
            {open && (
              <View style={styles.body}>
                <Text style={styles.muted}>{t("colProject")}: {c.projectName || "—"}</Text>
                {!!c.attachmentUrl && (
                  <Pressable onPress={() => Linking.openURL(c.attachmentUrl)}>
                    <Text style={styles.link}>{t("pcViewAttachment")}</Text>
                  </Pressable>
                )}
                {c.status === "rejected" && !!c.rejectionReason && (
                  <Text style={styles.danger}>{t("pcRejectedReason")}: {c.rejectionReason}</Text>
                )}
                {c.status === "pending" && (
                  <SecondaryButton label={t("pcEdit")} onPress={() => navigation.navigate("PettyCashEdit", { claimId: c.id })} />
                )}
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
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: { width: "48%", gap: 4, padding: 12 },
  tileLabel: { fontSize: 11, color: colors.muted },
  tileValue: { fontSize: 13, fontWeight: "700" },
  tileCount: { fontSize: 11, color: colors.faint },
  label: { fontSize: 12, fontWeight: "600", color: colors.text },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 6 },
  header: { flexDirection: "row", alignItems: "center", padding: 16, gap: 8 },
  title: { fontSize: 14, fontWeight: "600", color: colors.text },
  status: { fontSize: 12, fontWeight: "600" },
  body: { borderTopWidth: 1, borderTopColor: colors.border, padding: 16, gap: 10 },
  muted: { fontSize: 13, color: colors.muted },
  link: { color: colors.primary, fontWeight: "600", fontSize: 14 },
  danger: { fontSize: 13, color: colors.danger },
});
