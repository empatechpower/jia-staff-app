import React from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useT } from "../lib/i18n";
import { colors } from "../lib/theme";
import { Chip, Field, Label, SecondaryButton } from "./ui";
import type { Currency } from "../lib/petty";
import type { PickedFile } from "../lib/upload";
import { chooseFile, takePhoto } from "../lib/pickFile";

export type ClaimValues = {
  date: string;
  supplier: string;
  projectName: string;
  currency: Currency;
  amount: string;
  attachment: PickedFile | null;
};

export type ClaimErrors = Partial<Record<"date" | "supplier" | "projectName" | "amount" | "attachment", string>>;

type Props = {
  values: ClaimValues;
  onChange: (patch: Partial<ClaimValues>) => void;
  projects: { id: string; name: string }[];
  suppliers: string[];
  errors: ClaimErrors;
  existingAttachmentUrl?: string;
};

export default function ClaimFields({ values, onChange, projects, suppliers, errors, existingAttachmentUrl }: Props) {
  const { t } = useT();
  const typed = values.supplier.trim().toLowerCase();
  const suggestions = suppliers
    .filter((s) => (typed ? s.toLowerCase().includes(typed) && s.toLowerCase() !== typed : true))
    .slice(0, 6);

  return (
    <View style={{ gap: 14 }}>
      <Field error={errors.date}>
        <Label required>{t("pcDate")}</Label>
        <TextInput style={styles.input} value={values.date} onChangeText={(v) => onChange({ date: v })} placeholder="2026-10-05" placeholderTextColor={colors.faint} autoCapitalize="none" />
      </Field>

      <Field error={errors.supplier}>
        <Label required>{t("pcSupplier")}</Label>
        <TextInput style={styles.input} value={values.supplier} onChangeText={(v) => onChange({ supplier: v })} placeholderTextColor={colors.faint} />
        {suggestions.length > 0 && (
          <View style={styles.chips}>
            {suggestions.map((s) => <Chip key={s} label={s} selected={false} onPress={() => onChange({ supplier: s })} />)}
          </View>
        )}
      </Field>

      <Field error={errors.projectName}>
        <Label required>{t("project")}</Label>
        <View style={styles.chips}>
          {projects.map((p) => (
            <Chip key={p.id} label={p.name} selected={values.projectName === p.name} onPress={() => onChange({ projectName: p.name })} />
          ))}
        </View>
      </Field>

      <View style={styles.row}>
        <View style={{ flex: 1, gap: 6 }}>
          <Label required>{t("pcCurrency")}</Label>
          <View style={styles.chips}>
            {(["SGD", "MYR"] as Currency[]).map((c) => (
              <Chip key={c} label={c} selected={values.currency === c} onPress={() => onChange({ currency: c })} />
            ))}
          </View>
        </View>
        <Field error={errors.amount}>
          <Label required>{t("pcAmount")}</Label>
          <TextInput style={styles.input} value={values.amount} onChangeText={(v) => onChange({ amount: v })} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={colors.faint} />
        </Field>
      </View>

      <Field error={errors.attachment}>
        <Label required>{values.attachment ? values.attachment.name : t("pcAttachment")}</Label>
        {!values.attachment && !!existingAttachmentUrl && (
          <Pressable onPress={() => {}}>
            <Text style={styles.muted}>{t("pcViewAttachment")}</Text>
          </Pressable>
        )}
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <SecondaryButton label={t("takePhoto")} onPress={async () => { const f = await takePhoto(); if (f) onChange({ attachment: f }); }} />
          </View>
          <View style={{ flex: 1 }}>
            <SecondaryButton label={existingAttachmentUrl ? t("pcReplaceAttachment") : t("chooseFile")} onPress={async () => { const f = await chooseFile(); if (f) onChange({ attachment: f }); }} />
          </View>
        </View>
        {!values.attachment && <Text style={styles.muted}>{t("pcAttachmentHint")}</Text>}
      </Field>
    </View>
  );
}

const styles = StyleSheet.create({
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.text, backgroundColor: colors.card },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  row: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  muted: { fontSize: 12, color: colors.muted },
});
