import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable, Animated, Easing } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Line, Circle } from "react-native-svg";
import { GlassCard, NeoButton, GhostButton, H1, H2, Body } from "@/src/ui";
import { colors, gradient, radius, spacing } from "@/src/theme";
import { api } from "@/src/api";

// Skeleton connections (mocked pose)
const CONNECTIONS: [number, number][] = [
  [0,1],[1,2],[2,3],[3,7],[0,4],[4,5],[5,6],[6,8],   // head
  [11,12],[11,13],[13,15],[12,14],[14,16],           // arms
  [11,23],[12,24],[23,24],                            // torso
  [23,25],[25,27],[24,26],[26,28],[27,29],[28,30],[29,31],[30,32],
];

function makePose(t: number, correct: boolean) {
  // 33 landmarks, animated squat-like motion
  const cycle = (Math.sin(t) + 1) / 2; // 0..1
  const cx = 180, cy = 300;
  const dip = correct ? 40 * cycle : 55 * cycle;
  const kneeOffX = correct ? 0 : 12 * cycle;
  const pts: [number, number][] = new Array(33).fill([0,0]);
  // Head 0-10
  pts[0] = [cx, cy - 190 + dip * 0.5];
  pts[1] = [cx - 5, cy - 200 + dip * 0.5]; pts[2] = [cx - 10, cy - 195 + dip * 0.5]; pts[3] = [cx - 20, cy - 190 + dip * 0.5];
  pts[4] = [cx + 5, cy - 200 + dip * 0.5]; pts[5] = [cx + 10, cy - 195 + dip * 0.5]; pts[6] = [cx + 20, cy - 190 + dip * 0.5];
  pts[7] = [cx - 25, cy - 185 + dip * 0.5]; pts[8] = [cx + 25, cy - 185 + dip * 0.5];
  // Shoulders 11,12
  pts[11] = [cx - 40, cy - 130 + dip];
  pts[12] = [cx + 40, cy - 130 + dip];
  // Elbows 13,14
  pts[13] = [cx - 50, cy - 80 + dip * 0.6];
  pts[14] = [cx + 50, cy - 80 + dip * 0.6];
  // Wrists 15,16
  pts[15] = [cx - 55, cy - 30 + dip * 0.3];
  pts[16] = [cx + 55, cy - 30 + dip * 0.3];
  // Hips 23,24
  pts[23] = [cx - 25, cy + 20 + dip];
  pts[24] = [cx + 25, cy + 20 + dip];
  // Knees 25,26
  pts[25] = [cx - 30 - kneeOffX, cy + 90 + dip];
  pts[26] = [cx + 30 + kneeOffX, cy + 90 + dip];
  // Ankles 27,28
  pts[27] = [cx - 30, cy + 170];
  pts[28] = [cx + 30, cy + 170];
  // Feet 29-32
  pts[29] = [cx - 40, cy + 175]; pts[30] = [cx + 40, cy + 175];
  pts[31] = [cx - 20, cy + 175]; pts[32] = [cx + 20, cy + 175];
  return pts;
}

export default function FormCheckScreen({ exercise, onClose }: { exercise: any; onClose: (r?: any) => void }) {
  const [reps, setReps] = useState(0);
  const [tick, setTick] = useState(0);
  const [correct, setCorrect] = useState(true);
  const [ghost, setGhost] = useState(false);
  const [ended, setEnded] = useState(false);
  const [running, setRunning] = useState(true);
  const [scores, setScores] = useState<number[]>([]);

  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last = 0;
    let acc = 0;
    let phase = 0;
    const step = (ts: number) => {
      if (!last) last = ts;
      const dt = (ts - last) / 1000; last = ts;
      acc += dt;
      phase += dt * 1.8;
      setTick(phase);
      // Toggle correctness periodically
      if (acc > 2.5) {
        const nowCorrect = Math.random() > 0.35;
        setCorrect(nowCorrect);
        // count a rep on cycle
        setReps(r => r + 1);
        const s = nowCorrect ? 85 + Math.random() * 12 : 55 + Math.random() * 20;
        setScores(prev => [...prev, Math.round(s)]);
        acc = 0;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  const pose = useMemo(() => makePose(tick, correct), [tick, correct]);
  const ghostPose = useMemo(() => makePose(tick, true), [tick]);
  const avgScore = scores.length ? Math.round(scores.reduce((a,b) => a+b, 0) / scores.length) : 0;

  const end = async () => {
    setRunning(false);
    setEnded(true);
    try {
      await api.logForm({
        exercise_id: exercise.id, rep_scores: scores, avg_score: avgScore,
        issues: correct ? [] : ["Knee valgus detected"],
      });
      // Also create a workout for progress
      const wo = await api.createWorkout({
        split_day: "Form Check", exercises: [exercise],
        duration_min: 10, calories_burned: 60,
      });
      onClose({ workout: wo, day: { label: exercise.name, exercises: [exercise] }, reps, avgScore, scores });
    } catch { onClose(); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#04040a" }}>
      {/* Camera feed simulated */}
      <LinearGradient colors={["#0B0B14", "#181733", "#0B0B14"] as any} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={["rgba(139,92,246,0.15)", "transparent"] as any} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={{ flex: 1 }}>
        {/* Top HUD */}
        <View style={styles.hudTop}>
          <Pressable onPress={() => onClose()} style={styles.iconBtn} testID="form-close">
            <Ionicons name="close" size={22} color={colors.text} />
          </Pressable>
          <View style={styles.exBadge}>
            <View style={[styles.dot, { backgroundColor: colors.red }]} />
            <Text style={{ color: colors.text, fontWeight: "700" }}>LIVE</Text>
            <Text style={{ color: colors.textDim, marginLeft: 8 }}>{exercise.name}</Text>
          </View>
          <Pressable onPress={() => setGhost(g => !g)} style={[styles.iconBtn, ghost && { borderColor: colors.magenta }]} testID="form-ghost">
            <Ionicons name="body" size={20} color={ghost ? colors.magenta : colors.text} />
          </Pressable>
        </View>

        {/* Skeleton overlay */}
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Svg width={360} height={520} style={{ position: "absolute" }}>
            {ghost && ghostPose.map((p, i) => (
              <Circle key={`g${i}`} cx={p[0]} cy={p[1]} r={3} fill={colors.magenta} opacity={0.35} />
            ))}
            {ghost && CONNECTIONS.map(([a, b], i) => (
              <Line key={`gl${i}`} x1={ghostPose[a][0]} y1={ghostPose[a][1]} x2={ghostPose[b][0]} y2={ghostPose[b][1]} stroke={colors.magenta} strokeWidth={2} opacity={0.3} />
            ))}
            {CONNECTIONS.map(([a, b], i) => (
              <Line key={`l${i}`} x1={pose[a][0]} y1={pose[a][1]} x2={pose[b][0]} y2={pose[b][1]}
                    stroke={correct ? colors.green : colors.red} strokeWidth={3} opacity={0.9} />
            ))}
            {pose.map((p, i) => (
              <Circle key={i} cx={p[0]} cy={p[1]} r={4} fill={correct ? colors.cyan : colors.red} />
            ))}
          </Svg>
          {!correct && (
            <View style={styles.warnBanner}>
              <Ionicons name="warning" size={16} color="#0B0B14" />
              <Text style={{ color: "#0B0B14", fontWeight: "800", marginLeft: 6 }}>KNEE VALGUS DETECTED</Text>
            </View>
          )}
        </View>

        {/* Bottom HUD */}
        <View style={styles.hudBottom}>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>REPS</Text>
            <Text style={styles.metricValue}>{reps}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>FORM</Text>
            <Text style={[styles.metricValue, { color: avgScore > 75 ? colors.green : avgScore > 50 ? colors.cyan : colors.red }]}>{avgScore}%</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>STATUS</Text>
            <Text style={[styles.metricValue, { color: correct ? colors.green : colors.red, fontSize: 14 }]}>
              {correct ? "OPTIMAL" : "ADJUST"}
            </Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.xl }}>
          <NeoButton label="Complete Set" icon="checkmark-done" onPress={end} testID="form-end" />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  hudTop: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: spacing.lg, paddingTop: spacing.md,
  },
  iconBtn: {
    width: 42, height: 42, borderRadius: 21,
    borderWidth: 1, borderColor: "rgba(139,92,246,0.35)",
    backgroundColor: "rgba(11,11,20,0.6)",
    alignItems: "center", justifyContent: "center",
  },
  exBadge: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: "rgba(11,11,20,0.7)",
    borderWidth: 1, borderColor: "rgba(139,92,246,0.35)",
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  warnBanner: {
    position: "absolute", bottom: 20,
    flexDirection: "row", alignItems: "center",
    backgroundColor: colors.red, paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: radius.pill,
    shadowColor: colors.red, shadowOpacity: 0.8, shadowRadius: 15,
  },
  hudBottom: {
    flexDirection: "row", justifyContent: "space-around",
    marginHorizontal: spacing.lg, marginBottom: spacing.md,
    padding: spacing.lg, borderRadius: radius.xl,
    backgroundColor: "rgba(19,18,38,0.7)",
    borderWidth: 1, borderColor: "rgba(139,92,246,0.3)",
  },
  metric: { alignItems: "center" },
  metricLabel: { color: colors.textDim, fontSize: 10, letterSpacing: 2, marginBottom: 4 },
  metricValue: { color: colors.text, fontSize: 26, fontWeight: "800" },
});
