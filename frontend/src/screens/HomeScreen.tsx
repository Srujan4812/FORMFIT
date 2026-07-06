import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { GlassCard, NeoButton, GhostButton, H1, H2, Body, StatCard, SectionLabel } from "@/src/ui";
import { colors, gradient, radius, spacing } from "@/src/theme";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import FitnessScoreScreen from "@/src/screens/FitnessScoreScreen";
import ExerciseLibraryScreen from "@/src/screens/ExerciseLibraryScreen";

export default function HomeScreen({ onNavigate }: { onNavigate: (t: string) => void }) {
  const { user } = useAuth();
  const [score, setScore] = useState<any>(null);
  const [split, setSplit] = useState<any[]>([]);
  const [rec, setRec] = useState<any>({});
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal] = useState<"score" | "library" | null>(null);

  const load = async () => {
    try {
      const [s, sp, r] = await Promise.all([
        api.fitnessScore(),
        api.split(user?.current_split || "push_pull_legs"),
        api.latestRecovery(),
      ]);
      setScore(s); setSplit(sp); setRec(r);
    } catch (e) { console.warn(e); }
  };

  useEffect(() => { load(); }, []);

  const today = new Date().toLocaleString("en-US", { weekday: "short" });
  const todayDay = split.find(d => d.day === today) || split[0];

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  if (modal === "score") return <FitnessScoreScreen onBack={() => setModal(null)} />;
  if (modal === "library") return <ExerciseLibraryScreen onBack={() => setModal(null)} />;

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.cyan} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.hi}>COMMANDER</Text>
            <H1>{user?.name?.split(" ")[0] || "Athlete"}</H1>
          </View>
          <Pressable style={styles.streak} onPress={() => onNavigate("profile")} testID="header-streak">
            <Ionicons name="flame" size={16} color={colors.magenta} />
            <Text style={{ color: colors.text, fontWeight: "700", marginLeft: 6 }}>{user?.streak || 0}</Text>
          </Pressable>
        </View>

        {/* Fitness Score Card */}
        <Pressable onPress={() => setModal("score")} testID="home-fitness-card">
          <GlassCard style={{ marginTop: spacing.md }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ flex: 1 }}>
                <SectionLabel text="Fitness Score" />
                <View style={{ flexDirection: "row", alignItems: "baseline" }}>
                  <Text style={styles.bigNum}>{score?.total ?? "--"}</Text>
                  <Text style={{ color: colors.textDim, fontSize: 18, marginLeft: 4 }}>/100</Text>
                </View>
                <View style={styles.categoryPill}>
                  <LinearGradient colors={gradient.magenta} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                  <Text style={{ color: "#0B0B14", fontWeight: "800", fontSize: 11, letterSpacing: 1.5 }}>
                    {(score?.category || "…").toUpperCase()}
                  </Text>
                </View>
              </View>
              <RingViz value={score?.total ?? 0} />
            </View>
            <View style={{ height: 1, backgroundColor: "rgba(139,92,246,0.2)", marginVertical: spacing.md }} />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="bulb" size={14} color={colors.cyan} />
              <Text style={{ color: colors.textDim, fontSize: 12, flex: 1 }}>
                {score?.tip || "Complete a workout to unlock insights"}
              </Text>
            </View>
          </GlassCard>
        </Pressable>

        {/* Quick stats */}
        <View style={{ flexDirection: "row", gap: spacing.md, marginTop: spacing.md }}>
          <StatCard icon="flash" value={`${rec?.recommendation || "--"}`} label="Readiness" accent={colors.green} testID="stat-readiness" />
          <StatCard icon="calendar" value={`${todayDay?.label || "Rest"}`} label="Today" accent={colors.cyan} testID="stat-today" />
        </View>

        {/* Today's workout */}
        <SectionLabel text="Today's Mission" />
        <GlassCard>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View>
              <H2>{todayDay?.label || "Rest Day"}</H2>
              <Body dim style={{ marginTop: 4 }}>{todayDay?.exercises?.length || 0} exercises · ~45 min</Body>
            </View>
            <View style={styles.dayBadge}>
              <Text style={{ color: colors.cyan, fontSize: 10, letterSpacing: 2 }}>{today.toUpperCase()}</Text>
            </View>
          </View>
          {(todayDay?.exercises || []).slice(0, 4).map((ex: any, i: number) => (
            <View key={i} style={styles.exRow}>
              <View style={styles.exDot} />
              <Text style={{ color: colors.text, flex: 1, fontWeight: "600" }}>{ex.name}</Text>
              <Text style={{ color: colors.textDim, fontSize: 12 }}>{ex.sets}×{ex.reps}</Text>
            </View>
          ))}
          <NeoButton
            label="Launch Workout"
            icon="play"
            onPress={() => onNavigate("workouts")}
            style={{ marginTop: spacing.lg }}
            testID="home-launch-workout"
          />
        </GlassCard>

        {/* Quick actions */}
        <SectionLabel text="Quick Access" />
        <View style={{ flexDirection: "row", gap: spacing.md, flexWrap: "wrap" }}>
          <QuickAction icon="scan" label="Form Check" onPress={() => onNavigate("workouts")} testID="qa-form" />
          <QuickAction icon="library" label="Exercises" onPress={() => setModal("library")} testID="qa-lib" />
          <QuickAction icon="restaurant" label="Log Meal" onPress={() => onNavigate("nutrition")} testID="qa-meal" />
          <QuickAction icon="sparkles" label="AI Coach" onPress={() => onNavigate("coach")} testID="qa-coach" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function RingViz({ value }: { value: number }) {
  const size = 96;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <LinearGradient
        colors={gradient.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
      <View style={{
        position: "absolute", top: 10, left: 10, right: 10, bottom: 10,
        borderRadius: (size - 20) / 2, backgroundColor: colors.surface,
        alignItems: "center", justifyContent: "center",
      }}>
        <Text style={{ color: colors.text, fontSize: 26, fontWeight: "800" }}>{Math.round(value)}</Text>
      </View>
    </View>
  );
}

function QuickAction({ icon, label, onPress, testID }: any) {
  return (
    <Pressable testID={testID} onPress={onPress} style={styles.qaWrap}>
      <LinearGradient colors={["rgba(139,92,246,0.25)", "rgba(34,211,238,0.15)"] as any} style={StyleSheet.absoluteFill} />
      <View style={styles.qaInner}>
        <Ionicons name={icon} size={22} color={colors.cyan} />
        <Text style={{ color: colors.text, fontWeight: "600", fontSize: 13, marginTop: 6 }}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  hi: { color: colors.textDim, fontSize: 11, letterSpacing: 3 },
  streak: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: radius.pill, backgroundColor: "rgba(232,121,249,0.12)",
    borderWidth: 1, borderColor: "rgba(232,121,249,0.35)",
  },
  bigNum: { color: colors.text, fontSize: 56, fontWeight: "800", letterSpacing: -1 },
  categoryPill: {
    alignSelf: "flex-start", marginTop: 8, borderRadius: radius.pill,
    paddingHorizontal: 12, paddingVertical: 5, overflow: "hidden",
  },
  dayBadge: {
    borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: "rgba(34,211,238,0.4)",
  },
  exRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "rgba(139,92,246,0.1)" },
  exDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.cyan, shadowColor: colors.cyan, shadowOpacity: 1, shadowRadius: 6 },
  qaWrap: {
    width: "47%", aspectRatio: 1.4, borderRadius: radius.xl, overflow: "hidden",
    borderWidth: 1, borderColor: "rgba(139,92,246,0.25)",
  },
  qaInner: { flex: 1, padding: spacing.lg, justifyContent: "flex-end" },
});
