import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { api } from "../lib/api";
import { colors } from "../lib/theme";
import { loadProjects, type Project } from "../lib/projects";

const WORK_TYPES = ["Design & Consultation", "Technical & Documentation", "Project Execution", "Production Work"] as const;

import type { RootStackParamList as RootParams } from "../navigation";

export default function RecordProjectScreen({ navigation, route }: NativeStackScreenProps<RootParams, "RecordProject">) {
  const { timesheetEntryId, staffId, activeProjectEntryId } = route.params;
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState("");
  const [workType, setWorkType] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!activeProjectEntryId) loadProjects().then(setProjects).catch(() => {});
  }, [activeProjectEntryId]);

  async function clockOut() {
    if (!activeProjectEntryId) return;
    setSubmitting(true);
    setError("");
    try {
      await api.hr.endProjectAttendance({ entry_id: activeProjectEntryId, end_time: new Date().toISOString() });
      navigation.goBack();
    } catch (e: any) {
      setError(e?.message ?? "Could not clock out. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function clockIn() {
    if (!projectId || !workType) return;
    setSubmitting(true);
    setError("");
    try {
      await api.hr.recordProjectAttendance({
        timesheet_entry_id: timesheetEntryId,
        staff_id: staffId,
        hr_project_id: projectId,
        work_type: workType,
        start_time: new Date().toISOString(),
      });
      navigation.goBack();
    } catch (e: any) {
      setError(e?.message ?? "Could not record project attendance. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (activeProjectEntryId) {
    return (
      <View style={styles.screen}>
        <View style={styles.card}>
          <Text style={styles.title}>Clock Out Project</Text>
          <Text style={styles.muted}>You're currently clocked into a project. Tap below to clock out.</Text>
          {!!error && <Text style={styles.danger}>{error}</Text>}
          <Pressable style={[styles.primaryButton, submitting && styles.disabled]} onPress={clockOut} disabled={submitting}>
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Clock Out</Text>}
          </Pressable>
        </View>
      </View>
    );
  }

  const canSubmit = !!projectId && !!workType && !submitting;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>Record Project Attendance</Text>

        <Text style={styles.label}>Project</Text>
        <View style={styles.chipRow}>
          {projects.map((p) => (
            <Chip key={p.id} label={p.name} selected={projectId === p.id} onPress={() => setProjectId(p.id)} />
          ))}
        </View>

        <Text style={styles.label}>Work type</Text>
        <View style={styles.chipRow}>
          {WORK_TYPES.map((w) => (
            <Chip key={w} label={w} selected={workType === w} onPress={() => setWorkType(w)} />
          ))}
        </View>

        {!!error && <Text style={styles.danger}>{error}</Text>}

        <Pressable style={[styles.primaryButton, !canSubmit && styles.disabled]} onPress={clockIn} disabled={!canSubmit}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Clock In to Project</Text>}
        </Pressable>
      </View>
    </ScrollView>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16 },
  card: { backgroundColor: colors.card, borderRadius: 16, padding: 18, gap: 12, margin: 16 },
  title: { fontSize: 20, fontWeight: "700", color: colors.text },
  label: { fontSize: 12, fontWeight: "600", color: colors.text, marginTop: 4 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, color: colors.text },
  chipTextSelected: { color: "#fff", fontWeight: "600" },
  muted: { fontSize: 13, color: colors.muted },
  danger: { fontSize: 13, color: colors.danger },
  primaryButton: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  primaryButtonText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  disabled: { opacity: 0.5 },
});
