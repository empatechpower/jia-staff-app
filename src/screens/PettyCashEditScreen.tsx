import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useT } from "../lib/i18n";
import { colors } from "../lib/theme";
import { Card, PrimaryButton, SecondaryButton } from "../components/ui";
import ClaimFields, { type ClaimValues, type ClaimErrors } from "../components/ClaimFields";
import { loadProjects } from "../lib/projects";
import { loadClaims, loadSuppliers, type Claim } from "../lib/petty";
import { isValidDateKey } from "../lib/dates";
import { uploadToCloudinary, validateFile, type PickedFile } from "../lib/upload";
import type { RootStackParamList } from "../navigation";

type Props = NativeStackScreenProps<RootStackParamList, "PettyCashEdit">;

export default function PettyCashEditScreen({ navigation, route }: Props) {
  const { t } = useT();
  const { staffId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [claim, setClaim] = useState<Claim | null>(null);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [values, setValues] = useState<ClaimValues | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadProjects().then((ps) => setProjects(ps.map((p) => ({ id: p.id, name: p.name })))).catch(() => {});
    loadSuppliers().then(setSuppliers).catch(() => {});
    if (!staffId) return;
    // Re-read the claim: it may have been approved or rejected since the history screen loaded.
    loadClaims(staffId)
      .then((all) => {
        const c = all.find((x) => x.id === route.params.claimId) ?? null;
        if (c && c.status === "pending") {
          setClaim(c);
          setValues({
            date: c.date,
            supplier: c.supplier,
            projectName: c.projectName,
            currency: c.currency,
            amount: String(c.amount),
            attachment: null,
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [staffId, route.params.claimId]);

  if (loading) return <View style={styles.center}><Text style={styles.muted}>…</Text></View>;

  if (!claim || !values) {
    return (
      <View style={styles.center}>
        <Card style={{ alignItems: "center", gap: 12, padding: 24 }}>
          <Text style={styles.muted}>{t("pcEditUnavailable")}</Text>
          <SecondaryButton label={t("back")} onPress={() => navigation.goBack()} />
        </Card>
      </View>
    );
  }

  if (saved) {
    return (
      <View style={styles.center}>
        <Card style={{ alignItems: "center", gap: 12, padding: 24 }}>
          <Text style={styles.big}>{t("pcClaimUpdated")}</Text>
          <PrimaryButton label={t("back")} onPress={() => navigation.goBack()} />
        </Card>
      </View>
    );
  }

  function errorsFor(v: ClaimValues): ClaimErrors {
    const amount = Number(v.amount);
    return {
      date: !isValidDateKey(v.date) ? t("pcDateRequired") : "",
      supplier: v.supplier.trim() === "" ? t("pcSupplierRequired") : "",
      projectName: v.projectName === "" ? t("pcProjectRequired") : "",
      amount: v.amount === "" || !(amount > 0) ? t("pcAmountRequired") : "",
      // An existing receipt is kept unless a replacement is picked.
      attachment: !claim?.attachmentUrl && v.attachment === null ? t("pcAttachmentRequired") : "",
    };
  }

  const errs = attempted ? errorsFor(values) : {};
  const valid = Object.values(errorsFor(values)).every((e) => !e);

  async function save() {
    setAttempted(true);
    if (!valid || saving) return;
    setSaving(true);
    setError("");
    try {
      let attachmentUrl = claim?.attachmentUrl ?? "";
      if (values?.attachment) {
        const bad = validateFile(values.attachment as PickedFile);
        if (bad) throw new Error(bad);
        attachmentUrl = await uploadToCloudinary(values.attachment as PickedFile);
      }
      await api.hr.updatePettyCashClaim(claim!.id, {
        date: values!.date,
        supplier: values!.supplier,
        project_name: values!.projectName,
        currency: values!.currency,
        amount: values!.amount,
        attachment: attachmentUrl,
      });
      setSaved(true);
    } catch (e: any) {
      setError(e?.message || t("pcSaveError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Card>
        <ClaimFields
          values={values}
          onChange={(p) => setValues((v) => (v ? { ...v, ...p } : v))}
          projects={projects}
          suppliers={suppliers}
          errors={errs}
          existingAttachmentUrl={claim.attachmentUrl}
        />
      </Card>
      {!!error && <Text style={styles.danger}>{error}</Text>}
      <PrimaryButton label={t("pcSaveChanges")} onPress={save} busy={saving} disabled={saving} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 12 },
  center: { flex: 1, justifyContent: "center", padding: 16, backgroundColor: colors.bg },
  big: { fontSize: 18, fontWeight: "700", color: colors.text },
  muted: { fontSize: 14, color: colors.muted, textAlign: "center" },
  danger: { fontSize: 13, color: colors.danger },
});
