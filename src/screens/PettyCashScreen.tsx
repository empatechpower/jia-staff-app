import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useT } from "../lib/i18n";
import { colors } from "../lib/theme";
import { Card, PrimaryButton, SecondaryButton } from "../components/ui";
import ClaimFields, { type ClaimValues, type ClaimErrors } from "../components/ClaimFields";
import { loadProjects } from "../lib/projects";
import { loadSuppliers, formatTotals, type Currency } from "../lib/petty";
import { isValidDateKey, toDateKeyNow } from "../lib/dates";
import { uploadToCloudinary, validateFile, type PickedFile } from "../lib/upload";
import type { RootStackParamList } from "../navigation";

type Props = NativeStackScreenProps<RootStackParamList, "PettyCash">;

type Queued = ClaimValues & { key: string; attachment: PickedFile };

const emptyForm = (): ClaimValues => ({
  date: toDateKeyNow(),
  supplier: "",
  projectName: "",
  currency: "SGD",
  amount: "",
  attachment: null,
});

export default function PettyCashScreen({ navigation }: Props) {
  const { t } = useT();
  const { staffId } = useAuth();
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [form, setForm] = useState<ClaimValues>(emptyForm);
  const [queue, setQueue] = useState<Queued[]>([]);
  const [attempted, setAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    loadProjects().then((ps) => setProjects(ps.map((p) => ({ id: p.id, name: p.name })))).catch(() => {});
    loadSuppliers().then(setSuppliers).catch(() => {});
  }, []);

  function errorsFor(v: ClaimValues): ClaimErrors {
    const amount = Number(v.amount);
    return {
      date: !isValidDateKey(v.date) ? t("pcDateRequired") : "",
      supplier: v.supplier.trim() === "" ? t("pcSupplierRequired") : "",
      projectName: v.projectName === "" ? t("pcProjectRequired") : "",
      amount: v.amount === "" || !(amount > 0) ? t("pcAmountRequired") : "",
      attachment: v.attachment === null ? t("pcAttachmentRequired") : "",
    };
  }

  const formErrors = attempted ? errorsFor(form) : {};
  const formValid = Object.values(errorsFor(form)).every((e) => !e);

  function addAnother() {
    setAttempted(true);
    if (!formValid || !form.attachment) return;
    setQueue((q) => [...q, { ...form, key: `${Date.now()}-${Math.random()}`, attachment: form.attachment as PickedFile }]);
    setForm(emptyForm());
    setAttempted(false);
    setError("");
  }

  async function submitAll() {
    const includeCurrent = formValid && !!form.attachment;
    if (queue.length === 0 && !includeCurrent) {
      setAttempted(true);
      return;
    }
    setSubmitting(true);
    setError("");
    const batch: Queued[] = includeCurrent
      ? [...queue, { ...form, key: "current", attachment: form.attachment as PickedFile }]
      : [...queue];
    const remaining = [...batch];
    try {
      while (remaining.length > 0) {
        const c = remaining[0];
        const bad = validateFile(c.attachment);
        if (bad) throw new Error(bad);
        const url = await uploadToCloudinary(c.attachment);
        await api.hr.submitPettyCashClaim({
          staff_id: staffId,
          date: c.date,
          supplier: c.supplier,
          project_name: c.projectName,
          currency: c.currency,
          amount: c.amount,
          attachment: url,
        });
        remaining.shift();
      }
      setQueue([]);
      if (includeCurrent) setForm(emptyForm());
      setSubmitted(true);
    } catch (e: any) {
      // Keep only what didn't go through, so a retry never resends claims that already succeeded.
      setQueue(remaining.filter((c) => c.key !== "current"));
      setError(e?.message || t("pcSubmitError"));
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setForm(emptyForm());
    setQueue([]);
    setAttempted(false);
    setSubmitted(false);
    setError("");
  }

  const queuedTotal = formatTotals(queue.map((q) => ({
    id: q.key, date: q.date, supplier: q.supplier, projectName: q.projectName,
    currency: q.currency as Currency, amount: Number(q.amount), attachmentUrl: "", status: "pending" as const,
    rejectionReason: "", month: "", year: 0,
  })));

  if (submitted) {
    return (
      <View style={styles.center}>
        <Card style={{ alignItems: "center", gap: 12, padding: 24 }}>
          <Text style={styles.big}>{t("pcClaimSent")}</Text>
          <Text style={styles.muted}>{t("pcClaimSentDesc")}</Text>
          <SecondaryButton label={t("submitAnother")} onPress={reset} />
          <PrimaryButton label={t("backHome")} onPress={() => navigation.goBack()} />
        </Card>
      </View>
    );
  }

  const canSubmit = (queue.length > 0 || (formValid && !!form.attachment)) && !submitting;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.topRow}>
        <Text style={styles.heading}>{t("pettyCash")}</Text>
        <Pressable onPress={() => navigation.navigate("PettyCashHistory")}>
          <Text style={styles.link}>{t("viewHistory")}</Text>
        </Pressable>
      </View>

      <Card>
        <ClaimFields
          values={form}
          onChange={(p) => setForm((f) => ({ ...f, ...p }))}
          projects={projects}
          suppliers={suppliers}
          errors={formErrors}
        />
        <SecondaryButton label={`+ ${t("pcAddAnother")}`} onPress={addAnother} />
      </Card>

      {queue.length > 0 && (
        <Card>
          <View style={styles.topRow}>
            <Text style={styles.sectionTitle}>{t("pcQueued")}</Text>
            <Text style={styles.strong}>{queuedTotal}</Text>
          </View>
          {queue.map((q) => (
            <View key={q.key} style={styles.queueRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.queueSupplier} numberOfLines={1}>{q.supplier}</Text>
                <Text style={styles.muted}>{q.currency} {Number(q.amount).toFixed(2)} · {q.date}</Text>
              </View>
              <Pressable onPress={() => setQueue((x) => x.filter((c) => c.key !== q.key))}>
                <Text style={styles.remove}>{t("pcRemove")}</Text>
              </Pressable>
            </View>
          ))}
        </Card>
      )}

      {!!error && <Text style={styles.danger}>{error}</Text>}

      <PrimaryButton
        label={queue.length > 0 ? `${t("pcSubmitAll")} (${queue.length + (formValid && form.attachment ? 1 : 0)})` : t("pcSubmit")}
        onPress={submitAll}
        disabled={!canSubmit}
        busy={submitting}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 12 },
  center: { flex: 1, justifyContent: "center", padding: 16, backgroundColor: colors.bg },
  big: { fontSize: 20, fontWeight: "700", color: colors.text },
  heading: { fontSize: 20, fontWeight: "700", color: colors.text },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: colors.text },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  link: { color: colors.primary, fontWeight: "600" },
  strong: { fontWeight: "700", color: colors.text },
  muted: { fontSize: 12, color: colors.muted },
  danger: { fontSize: 13, color: colors.danger },
  queueRow: { flexDirection: "row", alignItems: "center", backgroundColor: colors.bg, borderRadius: 10, padding: 12, gap: 8 },
  queueSupplier: { fontSize: 14, fontWeight: "600", color: colors.text },
  remove: { color: colors.danger, fontWeight: "600", fontSize: 13 },
});
