import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { GlassCard, H1, H2, Body, SectionLabel } from "@/src/ui";
import { colors, gradient, radius, spacing } from "@/src/theme";
import { api } from "@/src/api";

export default function AnalyticsScreen({ onBack }: { onBack: () => void }) {
  const [hm, setHm] = useState<any>({});
  const [act, setAct] = useState<any>({});
  const [pl, setPl] = useState<any>(null);
  const [workouts, setWorkouts] = useState<any[]>([]);

  useEffect(() => {
    api.heatmap().then(setHm).catch(() => {});
    api.muscleActivation().then(setAct).catch(() => {});
    api.plateau().then(setPl).catch(() => {});
    api.workouts().then(setWorkouts).catch(() => {});
  }, []);

  // Build 7x8 grid (last 56 days)
  const today = new Date();
  const days = Array.from({ length: 56 }, (_, i) => {
    const d = new Date(today); d.setDate(today.getDate() - (55 - i));
    return d.toISOString().slice(0, 10);
  });
  const maxCount = Math.max(1, ...Object.values(hm as Record<string, number>));

  const hist: number[] = pl?.historical || [];
  const proj: number[] = pl?.projected || [];
  const allVals = [...hist, ...proj];
  const maxV = Math.max(...allVals, 100);
  const minV = Math.min(...allVals, 0);
  const range = Math.max(1, maxV - minV);

  const totalWorkouts = workouts.length;
  const totalMin = workouts.reduce((a, w) => a + (w.duration_min || 0), 0);
  const totalKcal = workouts.reduce((a, w) => a + (w.calories_burned || 0), 0);

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140 }}>
        <Pressable onPress={onBack} style={styles.back} testID="analytics-back">
          <Ionicons name="chevron-back" size={22} color={colors.text} />
          <Text style={{ color: colors.text, marginLeft: 4 }}>Back</Text>
        </Pressable>
        <H1 style={{ marginTop: 8 }}>Analytics</H1>
        <Body dim>Your training telemetry</Body>

        <View style={{ flexDirection: "row", gap: spacing.md, marginTop: spacing.lg }}>
          <MiniStat label="Sessions" value={String(totalWorkouts)} icon="barbell" />
          <MiniStat label="Minutes" value={String(totalMin)} icon="time" />
          <MiniStat label="Kcal" value={String(totalKcal)} icon="flame" />
        </View>

        <SectionLabel text="Consistency Heatmap" />
        <GlassCard>
          <View style={{ flexDirection: "row", gap: 4 }}>
            {Array.from({ length: 8 }).map((_, col) => (
              <View key={col} style={{ gap: 4 }}>
                {Array.from({ length: 7 }).map((_, row) => {
                  const dateStr = days[col * 7 + row];
                  const cnt = (hm as any)[dateStr] || 0;
                  const intensity = cnt / maxCount;
                  return (
                    <View key={row} style={[styles.hmCell, {
                      backgroundColor: cnt === 0 ? "rgba(139,92,246,0.08)" :
                        `rgba(34,211,238,${0.3 + intensity * 0.7})`,
                    }]} />
                  );
                })}
              </View>
            ))}
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12 }}>
            <Text style={{ color: colors.textDim, fontSize: 10 }}>Less</Text>
            {[0.15, 0.35, 0.55, 0.75, 1].map((v, i) => (
              <View key={i} style={[styles.hmCell, { backgroundColor: `rgba(34,211,238,${v})` }]} />
            ))}
            <Text style={{ color: colors.textDim, fontSize: 10 }}>More</Text>
          </View>
        </GlassCard>

        <SectionLabel text="Muscle Activation (last 30d)" />
        <GlassCard>
          {Object.entries(act).map(([k, v]: any) => (
            <View key={k} style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                <Text style={{ color: colors.text }}>{k}</Text>
                <Text style={{ color: colors.magenta, fontWeight: "700" }}>{v}%</Text>
              </View>
              <View style={styles.bar}>
                <LinearGradient
                  colors={v > 20 ? [colors.magenta, colors.red] as any : v > 10 ? gradient.primary : [colors.violet, colors.cyan] as any}
                  start={{x:0,y:0}} end={{x:1,y:0}}
                  style={{ width: `${Math.min(100, v * 2)}%`, height: "100%", borderRadius: 999 }}
                />
              </View>
            </View>
          ))}
        </GlassCard>

        <SectionLabel text={`Plateau Forecast · ${pl?.lift || "Bench"}`} />
        <GlassCard>
          <View style={{ flexDirection: "row", alignItems: "flex-end", height: 140, gap: 4 }}>
            {hist.map((v, i) => (
              <View key={`h${i}`} style={{ flex: 1, height: `${(v - minV) / range * 100}%`, borderRadius: 4, overflow: "hidden" }}>
                <LinearGradient colors={gradient.primary} style={StyleSheet.absoluteFill} />
              </View>
            ))}
            {proj.map((v, i) => (
              <View key={`p${i}`} style={{ flex: 1, height: `${(v - minV) / range * 100}%`, borderRadius: 4, borderWidth: 1.5, borderColor: colors.magenta, borderStyle: "dashed" }} />
            ))}
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
            <Text style={{ color: colors.cyan, fontSize: 11 }}>◆ Historical</Text>
            <Text style={{ color: colors.magenta, fontSize: 11 }}>◇ Projected</Text>
          </View>
        </GlassCard>
      </ScrollView>
    </SafeAreaView>
  );
}

function MiniStat({ label, value, icon }: any) {
  return (
    <GlassCard style={{ flex: 1 }}>
      <Ionicons name={icon} size={18} color={colors.cyan} />
      <Text style={{ color: colors.text, fontSize: 22, fontWeight: "800", marginTop: 6 }}>{value}</Text>
      <Text style={{ color: colors.textDim, fontSize: 10, letterSpacing: 1.5 }}>{label.toUpperCase()}</Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  back: { flexDirection: "row", alignItems: "center", paddingVertical: 6 },
  hmCell: { width: 24, height: 24, borderRadius: 6 },
  bar: { height: 8, backgroundColor: "rgba(139,92,246,0.15)", borderRadius: 999, overflow: "hidden" },
});
