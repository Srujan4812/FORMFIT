import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { GlassCard, NeoButton, H1, H2, Body, SectionLabel } from "@/src/ui";
import { colors, gradient, radius, spacing } from "@/src/theme";
import { api } from "@/src/api";

export default function FitnessScoreScreen({ onBack }: { onBack: () => void }) {
  const [s, setS] = useState<any>(null);
  useEffect(() => { api.fitnessScore().then(setS).catch(() => {}); }, []);

  const subs = s?.sub_scores || {};
  const trend: number[] = s?.trend || [];
  const maxT = Math.max(100, ...(trend.length ? trend : [100]));

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140 }}>
        <Pressable onPress={onBack} style={styles.backBtn} testID="back">
          <Ionicons name="chevron-back" size={22} color={colors.text} />
          <Text style={{ color: colors.text, marginLeft: 4 }}>Back</Text>
        </Pressable>

        <H1 style={{ marginTop: 8 }}>Fitness Score</H1>
        <Body dim>Composite index across 5 dimensions</Body>

        <GlassCard style={{ marginTop: spacing.lg, alignItems: "center" }}>
          <View style={styles.bigRing}>
            <LinearGradient colors={gradient.primary} start={{x:0,y:0}} end={{x:1,y:1}} style={StyleSheet.absoluteFill} />
            <View style={styles.bigRingInner}>
              <Text style={{ color: colors.text, fontSize: 60, fontWeight: "800" }}>{s?.total || "--"}</Text>
              <Text style={{ color: colors.textDim, fontSize: 12, letterSpacing: 2 }}>/ 100</Text>
            </View>
          </View>
          <View style={[styles.category, { marginTop: spacing.md }]}>
            <LinearGradient colors={gradient.magenta} start={{x:0,y:0}} end={{x:1,y:1}} style={StyleSheet.absoluteFill} />
            <Text style={{ color: "#0B0B14", fontWeight: "800", letterSpacing: 2 }}>{(s?.category || "…").toUpperCase()}</Text>
          </View>
        </GlassCard>

        <SectionLabel text="Sub-Scores" />
        {Object.entries(subs).map(([k, v]: any) => (
          <View key={k} style={styles.subRow}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
              <Text style={{ color: colors.text, fontWeight: "600" }}>{k}</Text>
              <Text style={{ color: colors.cyan, fontWeight: "800" }}>{v}</Text>
            </View>
            <View style={styles.barTrack}>
              <LinearGradient colors={gradient.primary} start={{x:0,y:0}} end={{x:1,y:0}}
                style={{ width: `${v}%`, height: "100%", borderRadius: 999 }} />
            </View>
          </View>
        ))}

        <SectionLabel text="8-Week Trend" />
        <GlassCard>
          <View style={{ flexDirection: "row", alignItems: "flex-end", height: 120, gap: 8 }}>
            {trend.map((v, i) => (
              <View key={i} style={{ flex: 1, height: `${v / maxT * 100}%`, borderRadius: 6, overflow: "hidden" }}>
                <LinearGradient colors={gradient.primary} style={StyleSheet.absoluteFill} />
              </View>
            ))}
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
            <Text style={{ color: colors.textDim, fontSize: 10 }}>8 wks ago</Text>
            <Text style={{ color: colors.textDim, fontSize: 10 }}>Now</Text>
          </View>
        </GlassCard>

        <SectionLabel text="AI Insight" />
        <GlassCard>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={styles.tipIcon}>
              <Ionicons name="sparkles" size={20} color={colors.magenta} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textDim, fontSize: 10, letterSpacing: 2 }}>WEAKEST · {s?.weakest?.toUpperCase()}</Text>
              <Text style={{ color: colors.text, marginTop: 6, lineHeight: 22 }}>{s?.tip}</Text>
            </View>
          </View>
        </GlassCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  backBtn: { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
  bigRing: {
    width: 200, height: 200, borderRadius: 100, overflow: "hidden",
    alignItems: "center", justifyContent: "center",
    shadowColor: colors.violet, shadowOpacity: 0.6, shadowRadius: 30, elevation: 20,
  },
  bigRingInner: {
    position: "absolute", top: 12, left: 12, right: 12, bottom: 12,
    borderRadius: 100, backgroundColor: colors.surface,
    alignItems: "center", justifyContent: "center",
  },
  category: {
    paddingHorizontal: 20, paddingVertical: 8, borderRadius: radius.pill, overflow: "hidden",
  },
  subRow: { marginBottom: spacing.md },
  barTrack: { height: 8, backgroundColor: "rgba(139,92,246,0.15)", borderRadius: 999, overflow: "hidden" },
  tipIcon: {
    width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(232,121,249,0.15)",
  },
});
