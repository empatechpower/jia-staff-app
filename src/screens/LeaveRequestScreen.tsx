import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View, Pressable } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useT } from "../lib/i18n";
import { colors } from "../lib/theme";
import { Card, Chip, Field, Label, PrimaryButton, SecondaryButton } from "../components/ui";
import { calcDays, DayType, Entitlement, isValidDateKey, LEAVE_FIELDS, LEAVE_TYPES, mapEntitlements } from "../lib/leave";
import { chooseFile, takePhoto } from "../lib/pickFile";
import { uploadToCloudinary, validateFile, type PickedFile } from "../lib/upload";
import type { RootStackParamList } from "../navigation";

type Props = NativeStackScreenProps<RootStackParamList, "LeaveRequest">;

const DAY_TYPES: DayType[] = ["full", "am", "pm"];

export default function LeaveRequestScreen({ navigation }: Props) {
  const { t } = useT();
  const { staffId } = useAuth();
  const [entitlements, setEntitlements] = useState<Entitlement[]>([]);
  const [leaveType, setLeaveType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [startDay, setStartDay] = useState<DayType>("full");
  const [endDay, setEndDay] = useState<DayType>("full");
  const [reason, setReason] = useState("");
  const [cert, setCert] = useState<PickedFile | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!staffId) return;
    api.hr.getLeaveEntitlements(staffId)
      .then((res: any) => setEntitlements(mapEntitlements(res?.response)))
      .catch(() => {});
  }, [staffId]);

  const requiresCert = leaveType === "Medical Leave (MC)" || leaveType === "Hospitalisation Leave (HL)";
  const requiresReason = leaveType === "Annual Leave" || leaveType === "Unpaid Leave";
  const selected = entitlements.find((e) => e.type === leaveType);
  const remaining = selected ? Math.max(0, selected.entitlement - selected.used) : null;

  const available = entitlements.length === 0
    ? LEAVE_TYPES
    : LEAVE_TYPES.filter((lt) => {
        if (lt === "Unpaid Leave") return true;
        const e = entitlements.find((x) => x.type === lt);
        return e ? e.entitlement - e.used > 0 : true;
      });

  const sameDay = from !== "" && from === to;
  const days = calcDays(from, to, startDay, endDay);
  const dateOrderBad = isValidDateKey(from) && isValidDateKey(to) && to < from;
  const overBalance = leaveType !== "" && leaveType !== "Unpaid Leave" && remaining !== null && days > remaining;

  const errors = {
    type: leaveType === "" ? "Select a leave type." : "",
    from: !isValidDateKey(from) ? "Enter a date as yyyy-mm-dd." : "",
    to: !isValidDateKey(to) ? "Enter a date as yyyy-mm-dd." : dateOrderBad ? t("toDateBeforeFrom") : "",
    reason: requiresReason && reason.trim() === "" ? "Reason is required for this leave type." : "",
    cert: requiresCert && !cert ? t("attachmentRequired") : "",
    balance: overBalance ? t("insufficientBalance") : "",
  };
  const hasErrors = Object.values(errors).some(Boolean);

  async function submit() {
    setAttempted(true);
    if (hasErrors || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const payload: Record<string, string> = {
        staff_id: staffId,
        leave_type: leaveType,
        from_date: from,
        to_date: to,
        day_type: startDay,
        start_day_type: startDay,
        end_day_type: endDay,
        days_requested: String(days),
        reason,
      };
      if (cert) {
        const bad = validateFile(cert);
        if (bad) throw new Error(bad);
        payload.certificate = await uploadToCloudinary(cert);
      }
      await api.hr.submitLeaveRequest(payload);
      setSubmitted(true);
    } catch (e: any) {
      setError(e?.message || t("submitError"));
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setLeaveType(""); setFrom(""); setTo(""); setStartDay("full"); setEndDay("full");
    setReason(""); setCert(null); setAttempted(false); setSubmitted(false); setError("");
  }

  async function attach(fn: () => Promise<PickedFile | null>) {
    const f = await fn();
    if (f) setCert(f);
  }

  if (submitted) {
    return (
      <View style={styles.center}>
        <Card style={{ alignItems: "center", gap: 12, padding: 24 }}>
          <Text style={styles.big}>{t("requestSent")}</Text>
          <Text style={styles.muted}>{t("requestSentDesc")}</Text>
          <SecondaryButton label={t("submitAnother")} onPress={reset} />
          <PrimaryButton label={t("backHome")} onPress={() => navigation.goBack()} />
        </Card>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Card>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>{t("leaveEntitlement")}</Text>
          <Pressable onPress={() => navigation.navigate("LeaveHistory")}>
            <Text style={styles.link}>{t("viewHistory")}</Text>
          </Pressable>
        </View>
        <View style={styles.tableHead}>
          <Text style={[styles.th, { flex: 2 }]}>{t("colLeaveType")}</Text>
          <Text style={styles.th}>{t("colEntitled")}</Text>
          <Text style={styles.th}>{t("colUsed")}</Text>
          <Text style={styles.th}>{t("colRemaining")}</Text>
        </View>
        {entitlements.map((e) => {
          const rem = Math.max(0, e.entitlement - e.used);
          return (
            <View key={e.type} style={styles.tr}>
              <Text style={[styles.td, { flex: 2 }]}>{e.abbr}</Text>
              <Text style={styles.td}>{e.entitlement}</Text>
              <Text style={styles.td}>{e.used}</Text>
              <Text style={[styles.td, { color: rem === 0 ? colors.danger : colors.success, fontWeight: "600" }]}>{rem}</Text>
            </View>
          );
        })}
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>{t("applyLeave")}</Text>

        <Field error={attempted ? errors.type : ""}>
          <Label required>{t("leaveType")}</Label>
          <View style={styles.chips}>
            {available.map((lt) => (
              <Chip key={lt} label={LEAVE_FIELDS[lt].abbr + " · " + lt} selected={leaveType === lt} onPress={() => { setLeaveType(lt); setCert(null); }} />
            ))}
          </View>
        </Field>

        <Field error={attempted ? errors.from : ""}>
          <Label required>{t("fromDate")}</Label>
          <TextInput style={styles.input} value={from} onChangeText={setFrom} placeholder="2026-10-06" placeholderTextColor={colors.faint} autoCapitalize="none" />
        </Field>

        <Field error={attempted ? errors.to : ""}>
          <Label required>{t("toDate")}</Label>
          <TextInput style={styles.input} value={to} onChangeText={setTo} placeholder="2026-10-06" placeholderTextColor={colors.faint} autoCapitalize="none" />
        </Field>

        <Label>{t("startDayType")}</Label>
        <View style={styles.chips}>
          {DAY_TYPES.map((d) => <Chip key={d} label={d === "full" ? t("fullDay") : d === "am" ? t("amHalf") : t("pmHalf")} selected={startDay === d} onPress={() => setStartDay(d)} />)}
        </View>

        {!sameDay && (
          <>
            <Label>{t("endDayType")}</Label>
            <View style={styles.chips}>
              {DAY_TYPES.map((d) => <Chip key={d} label={d === "full" ? t("fullDay") : d === "am" ? t("amHalf") : t("pmHalf")} selected={endDay === d} onPress={() => setEndDay(d)} />)}
            </View>
          </>
        )}

        <Field error={attempted ? errors.reason : ""}>
          <Label required={requiresReason}>{t("reason")}{!requiresReason ? ` (${t("optional")})` : ""}</Label>
          <TextInput style={[styles.input, styles.multiline]} value={reason} onChangeText={setReason} placeholder={t("reasonPlaceholder")} placeholderTextColor={colors.faint} multiline />
        </Field>

        {requiresCert && (
          <Field error={attempted ? errors.cert : ""}>
            <Label required>{cert ? cert.name : t("uploadCert")}</Label>
            <View style={styles.rowGap}>
              <SecondaryButton label={t("takePhoto")} onPress={() => attach(takePhoto)} />
              <SecondaryButton label={t("chooseFile")} onPress={() => attach(chooseFile)} />
            </View>
          </Field>
        )}

        {!!days && (
          <View style={styles.summary}>
            <Text style={styles.muted}>{t("leaveRequested")}: <Text style={styles.strong}>{days}</Text></Text>
            {remaining !== null && leaveType !== "Unpaid Leave" && (
              <Text style={styles.muted}>{t("balanceAfter")}: <Text style={[styles.strong, overBalance && { color: colors.danger }]}>{Math.max(0, remaining - days)}</Text></Text>
            )}
          </View>
        )}

        {attempted && !!errors.balance && <Text style={styles.danger}>{errors.balance}</Text>}
        {!!error && <Text style={styles.danger}>{error}</Text>}

        <PrimaryButton label={submitting ? t("submitting") : t("sendRequest")} onPress={submit} disabled={submitting} busy={submitting} />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 12 },
  center: { flex: 1, justifyContent: "center", padding: 16, backgroundColor: colors.bg },
  big: { fontSize: 20, fontWeight: "700", color: colors.text },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowGap: { flexDirection: "row", gap: 8 },
  link: { color: colors.primary, fontWeight: "600" },
  tableHead: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 6 },
  tr: { flexDirection: "row", paddingVertical: 6 },
  th: { flex: 1, fontSize: 11, color: colors.muted, fontWeight: "600" },
  td: { flex: 1, fontSize: 13, color: colors.text },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.text, backgroundColor: colors.card },
  multiline: { minHeight: 80, textAlignVertical: "top" },
  muted: { fontSize: 13, color: colors.muted },
  strong: { fontWeight: "700", color: colors.text },
  danger: { fontSize: 13, color: colors.danger },
  summary: { gap: 4, backgroundColor: colors.bg, borderRadius: 12, padding: 12 },
});
