import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { GlassCard, NeoButton, GhostButton, H1, H2, Body, SectionLabel, Chip } from "@/src/ui";
import { colors, gradient, radius, spacing } from "@/src/theme";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import AchievementsScreen from "@/src/screens/AchievementsScreen";
import AnalyticsScreen from "@/src/screens/AnalyticsScreen";
import RecoveryScreen from "@/src/screens/RecoveryScreen";
import FitnessScoreScreen from "@/src/screens/FitnessScoreScreen";

const GOALS = [
  { id: "cut", label: "Cut" },
  { id: "maintain", label: "Maintain" },
  { id: "bulk", label: "Bulk" },
];

export default function ProfileScreen({ onNavigate }: { onNavigate: (t: string) => void }) {
  const { user, logout, refresh } = useAuth();
  const [modal, setModal] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [f, setF] = useState<any>({
    height_cm: user?.height_cm || 178,
    weight_kg: user?.weight_kg || 78,
    body_fat_percent: user?.body_fat_percent || 15,
    age: user?.age || 28,
    sex: user?.sex || "male",
    goal: user?.goal || "maintain",
  });

  useEffect(() => {
    setF({
      height_cm: user?.height_cm || 178,
      weight_kg: user?.weight_kg || 78,
      body_fat_percent: user?.body_fat_percent || 15,
      age: user?.age || 28,
      sex: user?.sex || "male",
      goal: user?.goal || "maintain",
    });
  }, [user]);

  const save = async () => {
    await api.updateProfile(f);
    await refresh();
    setEditing(false);
  };

  if (modal === "achievements") return <AchievementsScreen onBack={() => setModal(null)} />;
  if (modal === "analytics") return <AnalyticsScreen onBack={() => setModal(null)} />;
  if (modal === "recovery") return <RecoveryScreen onBack={() => setModal(null)} />;
  if (modal === "score") return <FitnessScoreScreen onBack={() => setModal(null)} />;

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140 }}>
          <View style={{ alignItems: "center", marginBottom: spacing.lg, marginTop: 8 }}>
            <View style={styles.avatar}>
              <LinearGradient colors={gradient.primary} start={{x:0,y:0}} end={{x:1,y:1}} style={StyleSheet.absoluteFill} />
              <Text style={{ color: "#0B0B14", fontSize: 30, fontWeight: "800" }}>
                {(user?.name || "A").slice(0, 1).toUpperCase()}
              </Text>
            </View>
            <H1 style={{ marginTop: 12 }}>{user?.name}</H1>
            <Text style={{ color: colors.textDim, fontSize: 12 }}>{user?.email}</Text>
            <View style={styles.rankPill}>
              <LinearGradient colors={gradient.magenta} start={{x:0,y:0}} end={{x:1,y:1}} style={StyleSheet.absoluteFill} />
              <Text style={{ color: "#0B0B14", fontWeight: "800", fontSize: 11, letterSpacing: 2 }}>COMMANDER</Text>
            </View>
          </View>

          <GlassCard>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md }}>
              <H2>Body Metrics</H2>
              <Pressable onPress={() => (editing ? save() : setEditing(true))} testID="profile-edit">
                <Text style={{ color: colors.cyan, fontWeight: "700" }}>{editing ? "Save" : "Edit"}</Text>
              </Pressable>
            </View>
            <Row label="Height (cm)" value={f.height_cm} editing={editing} onChange={(v) => setF({ ...f, height_cm: parseFloat(v) || 0 })} />
            <Row label="Weight (kg)" value={f.weight_kg} editing={editing} onChange={(v) => setF({ ...f, weight_kg: parseFloat(v) || 0 })} />
            <Row label="Body Fat %" value={f.body_fat_percent} editing={editing} onChange={(v) => setF({ ...f, body_fat_percent: parseFloat(v) || 0 })} />
            <Row label="Age" value={f.age} editing={editing} onChange={(v) => setF({ ...f, age: parseInt(v) || 0 })} />
            {editing && (
              <View style={{ marginTop: spacing.md }}>
                <Text style={styles.fieldLabel}>SEX</Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {["male", "female", "other"].map(s => (
                    <Chip key={s} label={s} active={f.sex === s} onPress={() => setF({ ...f, sex: s })} />
                  ))}
                </View>
                <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>GOAL</Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {GOALS.map(g => (
                    <Chip key={g.id} label={g.label} active={f.goal === g.id} onPress={() => setF({ ...f, goal: g.id })} />
                  ))}
                </View>
              </View>
            )}
          </GlassCard>

          <SectionLabel text="Explore" />
          <View style={{ gap: spacing.sm }}>
            <MenuRow icon="pulse" label="Fitness Score Deep Dive" onPress={() => setModal("score")} testID="menu-score" />
            <MenuRow icon="stats-chart" label="Performance Analytics" onPress={() => setModal("analytics")} testID="menu-analytics" />
            <MenuRow icon="moon" label="Recovery Check-In" onPress={() => setModal("recovery")} testID="menu-recovery" />
            <MenuRow icon="trophy" label="Achievements" onPress={() => setModal("achievements")} testID="menu-achievements" />
          </View>

          <NeoButton
            label="Sign Out" icon="log-out" gradientFill={false}
            onPress={logout} style={{ marginTop: spacing.xl }}
            textStyle={{ color: colors.red }} testID="btn-logout"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Row({ label, value, editing, onChange }: any) {
  return (
    <View style={styles.row}>
      <Text style={{ color: colors.textDim }}>{label}</Text>
      {editing ? (
        <TextInput
          value={String(value)}
          onChangeText={onChange}
          keyboardType="numeric"
          style={styles.rowInput}
        />
      ) : (
        <Text style={{ color: colors.text, fontWeight: "700" }}>{value}</Text>
      )}
    </View>
  );
}

function MenuRow({ icon, label, onPress, testID }: any) {
  return (
    <Pressable testID={testID} onPress={onPress} style={styles.menuRow}>
      <View style={styles.menuIcon}>
        <Ionicons name={icon} size={18} color={colors.cyan} />
      </View>
      <Text style={{ color: colors.text, fontWeight: "600", flex: 1 }}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 90, height: 90, borderRadius: 45, overflow: "hidden",
    alignItems: "center", justifyContent: "center",
    shadowColor: colors.violet, shadowOpacity: 0.7, shadowRadius: 18, elevation: 12,
  },
  rankPill: {
    marginTop: 10, paddingHorizontal: 14, paddingVertical: 5,
    borderRadius: radius.pill, overflow: "hidden",
  },
  row: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "rgba(139,92,246,0.1)",
  },
  rowInput: {
    color: colors.text, fontWeight: "700", textAlign: "right",
    minWidth: 60, borderBottomWidth: 1, borderBottomColor: colors.cyan, padding: 2,
  },
  fieldLabel: { color: colors.textDim, fontSize: 10, letterSpacing: 2, marginBottom: 8 },
  menuRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 14, borderRadius: radius.lg,
    backgroundColor: "rgba(240,240,255,0.04)",
    borderWidth: 1, borderColor: "rgba(139,92,246,0.18)",
  },
  menuIcon: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(34,211,238,0.12)",
  },
});
