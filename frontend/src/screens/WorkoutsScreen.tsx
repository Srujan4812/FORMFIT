import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Modal } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { GlassCard, NeoButton, GhostButton, H1, H2, Body, Chip, SectionLabel } from "@/src/ui";
import { colors, gradient, radius, spacing } from "@/src/theme";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import FormCheckScreen from "@/src/screens/FormCheckScreen";
import PostWorkoutScreen from "@/src/screens/PostWorkoutScreen";

const SPLITS = [
  { id: "push_pull_legs", name: "Push · Pull · Legs", tag: "PPL", desc: "Classic hypertrophy split", freq: "6 days" },
  { id: "upper_lower", name: "Upper · Lower", tag: "U/L", desc: "Balanced 4-day frequency", freq: "4 days" },
  { id: "bro", name: "Bro Split", tag: "BRO", desc: "One muscle per day", freq: "5 days" },
  { id: "four_day", name: "4-Day Split", tag: "4D", desc: "Chest+Tri, Back+Bi, Legs, Sh+Core", freq: "4 days" },
  { id: "full_body", name: "Full Body", tag: "FB", desc: "3x/week compound focus", freq: "3 days" },
  { id: "custom", name: "Custom", tag: "CUSTOM", desc: "Build your own weekly plan", freq: "You choose" },
];

export default function WorkoutsScreen({ onNavigate }: { onNavigate: (t: string) => void }) {
  const { user, refresh } = useAuth();
  const [split, setSplit] = useState<any[]>([]);
  const [showSplits, setShowSplits] = useState(false);
  const [formCheck, setFormCheck] = useState<any>(null);
  const [postWorkout, setPostWorkout] = useState<any>(null);

  const load = async () => {
    try {
      const sp = await api.split(user?.current_split || "push_pull_legs");
      setSplit(sp);
    } catch {}
  };

  useEffect(() => { load(); }, [user?.current_split]);

  const selectSplit = async (s: string) => {
    await api.selectSplit(s); await refresh(); await load(); setShowSplits(false);
  };

  const startFormCheck = (ex: any) => setFormCheck(ex);

  const completeSet = async (day: any) => {
    const wo = await api.createWorkout({
      split_day: day.label,
      exercises: day.exercises,
      duration_min: 45,
      calories_burned: 320,
    });
    await refresh();
    setPostWorkout({ workout: wo, day });
  };

  if (formCheck) {
    return <FormCheckScreen exercise={formCheck} onClose={(result) => {
      setFormCheck(null);
      if (result?.workout) setPostWorkout(result);
    }} />;
  }
  if (postWorkout) return <PostWorkoutScreen data={postWorkout} onClose={() => setPostWorkout(null)} />;

  const currentSplitName = SPLITS.find(s => s.id === user?.current_split)?.name || "PPL";

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140 }}>
        <View style={styles.header}>
          <View>
            <Text style={{ color: colors.textDim, fontSize: 11, letterSpacing: 3 }}>TRAIN</Text>
            <H1>Weekly Grid</H1>
          </View>
          <Pressable onPress={() => setShowSplits(true)} style={styles.splitBtn} testID="btn-change-split">
            <Ionicons name="git-branch" size={14} color={colors.cyan} />
            <Text style={{ color: colors.cyan, fontWeight: "700", fontSize: 12 }}>{currentSplitName}</Text>
          </Pressable>
        </View>

        {split.map((day, idx) => (
          <GlassCard key={idx} style={{ marginBottom: spacing.md }} testID={`day-${day.day}`}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={styles.dayCircle}>
                  <LinearGradient colors={gradient.primary} start={{x:0,y:0}} end={{x:1,y:1}} style={StyleSheet.absoluteFill} />
                  <Text style={{ color: "#0B0B14", fontWeight: "800" }}>{day.day.slice(0, 2).toUpperCase()}</Text>
                </View>
                <View>
                  <H2>{day.label}</H2>
                  <Body dim style={{ fontSize: 12 }}>{day.exercises?.length || 0} exercises</Body>
                </View>
              </View>
            </View>
            {(day.exercises || []).map((ex: any, i: number) => (
              <Pressable key={i} style={styles.exRow} onPress={() => startFormCheck(ex)} testID={`ex-${day.day}-${i}`}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: "600" }}>{ex.name}</Text>
                  <Text style={{ color: colors.textDim, fontSize: 12, marginTop: 2 }}>
                    {ex.sets} × {ex.reps} · rest {ex.rest_sec}s
                  </Text>
                </View>
                <View style={styles.formCheckBtn}>
                  <Ionicons name="scan-circle" size={22} color={colors.cyan} />
                </View>
              </Pressable>
            ))}
            {day.exercises?.length > 0 && (
              <NeoButton label="Complete Session" icon="checkmark-circle" onPress={() => completeSet(day)}
                style={{ marginTop: spacing.md }} testID={`complete-${day.day}`} />
            )}
          </GlassCard>
        ))}
      </ScrollView>

      <Modal visible={showSplits} transparent animationType="slide" onRequestClose={() => setShowSplits(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" }}>
          <View style={styles.sheet}>
            <View style={styles.grabber} />
            <H2 style={{ marginBottom: spacing.md }}>Choose your split</H2>
            {SPLITS.map(s => (
              <Pressable key={s.id} onPress={() => selectSplit(s.id)} style={[styles.splitOpt, user?.current_split === s.id && styles.splitOptActive]} testID={`split-${s.id}`}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: "700", fontSize: 15 }}>{s.name}</Text>
                  <Text style={{ color: colors.textDim, fontSize: 12, marginTop: 2 }}>{s.desc} · {s.freq}</Text>
                </View>
                <View style={styles.splitTag}>
                  <Text style={{ color: colors.cyan, fontSize: 11, fontWeight: "800", letterSpacing: 1 }}>{s.tag}</Text>
                </View>
              </Pressable>
            ))}
            <GhostButton label="Close" onPress={() => setShowSplits(false)} style={{ marginTop: spacing.md }} testID="close-splits" />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg },
  splitBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill,
    borderWidth: 1, borderColor: "rgba(34,211,238,0.4)",
    backgroundColor: "rgba(34,211,238,0.08)",
  },
  dayCircle: { width: 44, height: 44, borderRadius: 22, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  exRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 12, borderTopWidth: 1, borderTopColor: "rgba(139,92,246,0.12)",
  },
  formCheckBtn: {
    width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(34,211,238,0.4)",
  },
  sheet: {
    backgroundColor: "#131226", padding: spacing.xl, paddingBottom: 40,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderTopWidth: 1, borderColor: "rgba(139,92,246,0.3)",
  },
  grabber: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.textFaint, alignSelf: "center", marginBottom: spacing.lg },
  splitOpt: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: spacing.md, borderRadius: radius.lg,
    backgroundColor: "rgba(240,240,255,0.03)",
    borderWidth: 1, borderColor: "rgba(139,92,246,0.2)",
    marginBottom: spacing.sm,
  },
  splitOptActive: { borderColor: "rgba(34,211,238,0.6)", backgroundColor: "rgba(34,211,238,0.08)" },
  splitTag: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.sm,
    backgroundColor: "rgba(34,211,238,0.15)",
  },
});
