import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { GlassCard, NeoButton, H1, H2, Body, SectionLabel } from "@/src/ui";
import { colors, gradient, radius, spacing } from "@/src/theme";
import { api } from "@/src/api";

export default function RecoveryScreen({ onBack }: { onBack: () => void }) {
  const [sore, setSore] = useState(4);
  const [sleep, setSleep] = useState(7);
  const [energy, setEnergy] = useState(7);
  const [result, setResult] = useState<any>(null);

  useEffect(() => { api.latestRecovery().then((r: any) => { if (r?.soreness) { setSore(r.soreness); setSleep(r.sleep_hours); setEnergy(r.energy); }}).catch(() => {}); }, []);

  const submit = async () => {
    const r = await api.logRecovery({ soreness: sore, sleep_hours: sleep, energy });
    setResult(r);
  };

  const recColors: any = { Light: colors.red, Moderate: colors.cyan, Full: colors.green };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140 }}>
        <Pressable onPress={onBack} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 6 }} testID="rec-back">
          <Ionicons name="chevron-back" size={22} color={colors.text} />
          <Text style={{ color: colors.text, marginLeft: 4 }}>Back</Text>
        </Pressable>
        <H1 style={{ marginTop: 4 }}>Recovery Check-In</H1>
        <Body dim>Calibrate today's training load</Body>

        <SectionLabel text="Soreness (1 fresh · 10 wrecked)" />
        <GlassCard>
          <Slider value={sore} onChange={setSore} min={1} max={10} accent={colors.red} testID="slider-soreness" />
        </GlassCard>

        <SectionLabel text="Sleep (hours)" />
        <GlassCard>
          <Slider value={sleep} onChange={setSleep} min={3} max={12} step={0.5} accent={colors.cyan} testID="slider-sleep" />
        </GlassCard>

        <SectionLabel text="Energy (1 · 10)" />
        <GlassCard>
          <Slider value={energy} onChange={setEnergy} min={1} max={10} accent={colors.green} testID="slider-energy" />
        </GlassCard>

        <NeoButton label="Get Recommendation" icon="pulse" onPress={submit} style={{ marginTop: spacing.xl }} testID="rec-submit" />

        {result && (
          <GlassCard style={{ marginTop: spacing.lg, alignItems: "center" }}>
            <Ionicons name="moon" size={40} color={recColors[result.recommendation] || colors.cyan} />
            <Text style={{ color: colors.textDim, fontSize: 11, letterSpacing: 3, marginTop: 8 }}>RECOMMENDED INTENSITY</Text>
            <Text style={[styles.rec, { color: recColors[result.recommendation] || colors.cyan }]}>
              {result.recommendation.toUpperCase()}
            </Text>
            <Text style={{ color: colors.textDim, marginTop: 4 }}>Score: {result.score}</Text>
          </GlassCard>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Slider({ value, onChange, min, max, step = 1, accent, testID }: any) {
  const marks = [];
  for (let v = min; v <= max; v += step) marks.push(v);
  return (
    <View>
      <Text style={{ color: colors.text, fontSize: 40, fontWeight: "800", textAlign: "center" }}>{value}</Text>
      <View style={{ flexDirection: "row", gap: 3, marginTop: 12 }} testID={testID}>
        {marks.map((v, i) => (
          <Pressable key={i} onPress={() => onChange(v)} style={{ flex: 1 }}>
            <View style={{
              height: 30, borderRadius: 4,
              backgroundColor: v <= value ? accent : "rgba(139,92,246,0.15)",
              opacity: v <= value ? 1 : 0.6,
            }} />
          </Pressable>
        ))}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
        <Text style={{ color: colors.textDim, fontSize: 10 }}>{min}</Text>
        <Text style={{ color: colors.textDim, fontSize: 10 }}>{max}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rec: { fontSize: 40, fontWeight: "800", marginTop: 4, letterSpacing: 2 },
});
