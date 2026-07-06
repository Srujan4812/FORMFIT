import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { GlassCard, NeoButton, GhostButton, H1, H2, Body, SectionLabel } from "@/src/ui";
import { colors, gradient, radius, spacing } from "@/src/theme";

export default function PostWorkoutScreen({ data, onClose }: { data: any; onClose: () => void }) {
  const scores: number[] = data?.scores || [88, 92, 76, 84, 90, 71, 87, 93];
  const avg = data?.avgScore || Math.round(scores.reduce((a,b)=>a+b,0) / (scores.length || 1));
  const reps = data?.reps || scores.length;
  const isPR = avg >= 88;

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140 }}>
        <View style={{ alignItems: "center", marginTop: spacing.md, marginBottom: spacing.lg }}>
          <View style={styles.trophyOrb}>
            <LinearGradient colors={gradient.magenta} start={{x:0,y:0}} end={{x:1,y:1}} style={StyleSheet.absoluteFill} />
            <Ionicons name={isPR ? "trophy" : "checkmark-circle"} size={40} color="#0B0B14" />
          </View>
          <Text style={{ color: colors.textDim, fontSize: 11, letterSpacing: 3, marginTop: 12 }}>TRANSMISSION COMPLETE</Text>
          <H1 style={{ marginTop: 4 }}>{isPR ? "New Personal Record" : "Solid Session"}</H1>
        </View>

        <View style={{ flexDirection: "row", gap: spacing.md }}>
          <GlassCard style={{ flex: 1 }}>
            <Text style={styles.smLabel}>FORM SCORE</Text>
            <Text style={[styles.bigStat, { color: avg > 75 ? colors.green : colors.cyan }]}>{avg}%</Text>
          </GlassCard>
          <GlassCard style={{ flex: 1 }}>
            <Text style={styles.smLabel}>REPS</Text>
            <Text style={styles.bigStat}>{reps}</Text>
          </GlassCard>
        </View>

        <GlassCard style={{ marginTop: spacing.md }}>
          <SectionLabel text="Rep Timeline" />
          <View style={{ flexDirection: "row", gap: 4, alignItems: "flex-end", height: 80 }}>
            {scores.map((s, i) => (
              <View key={i} style={{ flex: 1, height: `${s}%`, borderRadius: 4, overflow: "hidden" }}>
                <LinearGradient
                  colors={s >= 80 ? gradient.success : s >= 60 ? gradient.primary : gradient.danger}
                  style={StyleSheet.absoluteFill}
                />
              </View>
            ))}
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: spacing.sm }}>
            <Text style={{ color: colors.textDim, fontSize: 11 }}>Rep 1</Text>
            <Text style={{ color: colors.textDim, fontSize: 11 }}>Rep {scores.length}</Text>
          </View>
        </GlassCard>

        <GlassCard style={{ marginTop: spacing.md }}>
          <SectionLabel text="AI Insights" />
          <View style={styles.insight}>
            <Ionicons name="checkmark-circle" size={16} color={colors.green} />
            <Text style={{ color: colors.text, flex: 1, marginLeft: 8 }}>
              Strong depth control on {Math.max(...scores)}% rep — replicate that hip drive.
            </Text>
          </View>
          <View style={styles.insight}>
            <Ionicons name="warning" size={16} color={colors.magenta} />
            <Text style={{ color: colors.text, flex: 1, marginLeft: 8 }}>
              Worst rep dropped to {Math.min(...scores)}% — knee tracking drifted inward.
            </Text>
          </View>
          <View style={styles.insight}>
            <Ionicons name="bulb" size={16} color={colors.cyan} />
            <Text style={{ color: colors.text, flex: 1, marginLeft: 8 }}>
              Try Ghost Overlay drills to re-groove your movement pattern.
            </Text>
          </View>
        </GlassCard>

        <NeoButton label="Continue" icon="arrow-forward" onPress={onClose} style={{ marginTop: spacing.xl }} testID="post-continue" />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  trophyOrb: {
    width: 80, height: 80, borderRadius: 40, overflow: "hidden",
    alignItems: "center", justifyContent: "center",
    shadowColor: colors.magenta, shadowOpacity: 0.7, shadowRadius: 20, elevation: 12,
  },
  smLabel: { color: colors.textDim, fontSize: 10, letterSpacing: 2 },
  bigStat: { color: colors.text, fontSize: 40, fontWeight: "800", marginTop: 6 },
  insight: { flexDirection: "row", alignItems: "flex-start", marginTop: spacing.sm, gap: 4 },
});
