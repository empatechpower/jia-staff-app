import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { colors } from "../lib/theme";

export function Chip({ label, selected, onPress, disabled }: { label: string; selected: boolean; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.chip, selected && styles.chipSelected, disabled && styles.disabled]}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <Text style={styles.label}>
      {children}
      {required ? <Text style={styles.required}> *</Text> : null}
    </Text>
  );
}

export function Field({ error, children }: { error?: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      {children}
      {!!error && <Text style={styles.danger}>{error}</Text>}
    </View>
  );
}

export function PrimaryButton({ label, onPress, disabled, busy }: { label: string; onPress: () => void; disabled?: boolean; busy?: boolean }) {
  return (
    <Pressable style={[styles.primaryButton, (disabled || busy) && styles.disabled]} onPress={onPress} disabled={disabled || busy}>
      {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>{label}</Text>}
    </Pressable>
  );
}

export function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.secondaryButton} onPress={onPress}>
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  );
}


const styles = StyleSheet.create({
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.card },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, color: colors.text },
  chipTextSelected: { color: "#fff", fontWeight: "600" },
  card: { backgroundColor: colors.card, borderRadius: 16, padding: 16, gap: 12 },
  label: { fontSize: 12, fontWeight: "600", color: colors.text },
  required: { color: colors.danger },
  danger: { fontSize: 12, color: colors.danger },
  primaryButton: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: "center", justifyContent: "center", minHeight: 48 },
  primaryButtonText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  secondaryButton: { borderWidth: 1, borderColor: colors.primary, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  secondaryButtonText: { color: colors.primary, fontWeight: "600", fontSize: 14 },
  disabled: { opacity: 0.5 },
});
