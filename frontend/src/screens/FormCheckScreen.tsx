import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, Platform, ScrollView } from "react-native";
import { WebView } from "react-native-webview";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { NeoButton, Chip } from "@/src/ui";
import { colors, gradient, radius, spacing } from "@/src/theme";
import { api } from "@/src/api";

const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL;

const EXERCISE_CODES: Record<string, string> = {
  sq: "sq", sq_bw: "sq", dl: "dl", bp: "bp", pu: "pu", op: "op", lg: "lg", lg_bw: "lg", pl: "pl",
  pushup: "pushup", pu_wall: "pushup",
  rd: "dl", rw: "bp", cu: "bp", tr: "bp", hp: "sq", gb: "sq", cu_p: "pu", pu_assist: "pu",
  sit: "pl", mc: "pl", burp: "sq", step: "lg",
};

const CHIPS = [
  { id: "sq", label: "Squat" },
  { id: "pushup", label: "Push-Up" },
  { id: "dl", label: "Deadlift" },
  { id: "bp", label: "Bench" },
  { id: "pu", label: "Pull-Up" },
  { id: "op", label: "OH Press" },
  { id: "lg", label: "Lunge" },
  { id: "pl", label: "Plank" },
];

export default function FormCheckScreen({ exercise, onClose }: { exercise: any; onClose: (r?: any) => void }) {
  const code = EXERCISE_CODES[exercise?.id] || "sq";
  const [current, setCurrent] = useState(code);
  const [ghost, setGhost] = useState(false);
  const [reps, setReps] = useState(0);
  const [avg, setAvg] = useState(0);
  const [scores, setScores] = useState<number[]>([]);
  const [warning, setWarning] = useState<string>("");
  const [ready, setReady] = useState(false);
  const webRef = useRef<WebView>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const sendCmd = (payload: any) => {
    const msg = JSON.stringify(payload);
    if (Platform.OS === "web") {
      iframeRef.current?.contentWindow?.postMessage(msg, "*");
    } else {
      webRef.current?.postMessage(msg);
    }
  };

  useEffect(() => { sendCmd({ exercise: current }); }, [current]);
  useEffect(() => { sendCmd({ ghost }); }, [ghost]);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const handler = (e: MessageEvent) => {
      try {
        const d = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        onPoseMessage(d);
      } catch {}
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [reps, scores]);

  const onPoseMessage = (d: any) => {
    if (d?.event === "ready") setReady(true);
    if (d?.event === "rep") {
      setReps(d.reps);
      const s = [...scores, d.score];
      setScores(s);
      setAvg(Math.round(s.reduce((a, b) => a + b, 0) / s.length));
      setWarning(d.faults?.[0] || "");
      setTimeout(() => setWarning(""), 2200);
    }
    if (d?.event === "end") {
      finish({ reps: d.reps, avg_score: d.avg_score, scores: d.scores, data: d.data });
    }
  };

  const finish = async (result: any) => {
    try {
      await api.logForm({
        exercise_id: current, rep_scores: result.scores || scores,
        avg_score: result.avg_score || avg, issues: [],
      });
      const wo = await api.createWorkout({
        split_day: "Form Check", exercises: [{ ...exercise, id: current }],
        duration_min: 10, calories_burned: 60,
      });
      onClose({ workout: wo, day: { label: exercise?.name || "Session", exercises: [exercise] },
                reps: result.reps || reps, avgScore: result.avg_score || avg,
                scores: result.scores || scores });
    } catch (e) { onClose(); }
  };

  const endSession = () => sendCmd({ action: "end" });
  const poseUrl = `${BACKEND}/api/pose-view`;

  return (
    <View style={{ flex: 1, backgroundColor: "#04040a" }}>
      {Platform.OS === "web" ? (
        // @ts-ignore - iframe on web
        <iframe
          ref={iframeRef as any}
          src={poseUrl}
          allow="camera; microphone"
          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: 0 }}
        />
      ) : (
        <WebView
          ref={webRef}
          source={{ uri: poseUrl }}
          style={StyleSheet.absoluteFill}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={["*"]}
          onMessage={(ev) => {
            try { onPoseMessage(JSON.parse(ev.nativeEvent.data)); } catch {}
          }}
        />
      )}

      <SafeAreaView style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {/* Top HUD */}
        <View style={styles.hudTop}>
          <Pressable onPress={() => onClose()} style={styles.iconBtn} testID="form-close">
            <Ionicons name="close" size={22} color={colors.text} />
          </Pressable>
          <View style={styles.exBadge}>
            <View style={[styles.dot, { backgroundColor: ready ? colors.red : colors.textFaint }]} />
            <Text style={{ color: colors.text, fontWeight: "800", fontSize: 12 }}>{ready ? "LIVE" : "LOADING"}</Text>
          </View>
          <Pressable onPress={() => setGhost(g => !g)} style={[styles.iconBtn, ghost && { borderColor: colors.magenta, backgroundColor: "rgba(232,121,249,0.15)" }]} testID="form-ghost">
            <Ionicons name="body" size={20} color={ghost ? colors.magenta : colors.text} />
          </Pressable>
        </View>

        {/* Exercise chips */}
        <View style={{ height: 56, marginTop: 4 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: spacing.lg }}>
            {CHIPS.map(c => (
              <Chip key={c.id} label={c.label} active={current === c.id} onPress={() => setCurrent(c.id)} testID={`chip-${c.id}`} />
            ))}
          </ScrollView>
        </View>

        {/* Live warning banner (mirrors what the WebView shows, in case) */}
        {warning ? (
          <View style={styles.warn} testID="form-warn">
            <Ionicons name="warning" size={16} color="#0B0B14" />
            <Text style={{ color: "#0B0B14", fontWeight: "800", marginLeft: 6, letterSpacing: 1 }}>
              {warning.toUpperCase()}
            </Text>
          </View>
        ) : null}

        <View style={{ flex: 1 }} />

        {/* Bottom action */}
        <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md }}>
          <View style={styles.metrics}>
            <View style={styles.metric}><Text style={styles.mLabel}>REPS</Text><Text style={styles.mVal}>{reps}</Text></View>
            <View style={styles.metric}><Text style={styles.mLabel}>FORM</Text><Text style={[styles.mVal, { color: avg > 75 ? colors.green : avg > 50 ? colors.cyan : colors.red }]}>{avg}%</Text></View>
          </View>
          <NeoButton label="Complete Set" icon="checkmark-done" onPress={endSession} testID="form-end" />
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
    borderWidth: 1, borderColor: "rgba(139,92,246,0.4)",
    backgroundColor: "rgba(11,11,20,0.7)",
    alignItems: "center", justifyContent: "center",
  },
  exBadge: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: "rgba(11,11,20,0.8)",
    borderWidth: 1, borderColor: "rgba(139,92,246,0.4)",
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  warn: {
    alignSelf: "center", marginTop: spacing.md,
    flexDirection: "row", alignItems: "center",
    backgroundColor: colors.red, paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: radius.pill,
    shadowColor: colors.red, shadowOpacity: 0.8, shadowRadius: 15,
  },
  metrics: {
    flexDirection: "row", justifyContent: "space-around",
    padding: spacing.lg, borderRadius: radius.xl,
    backgroundColor: "rgba(19,18,38,0.85)",
    borderWidth: 1, borderColor: "rgba(139,92,246,0.35)",
  },
  metric: { alignItems: "center" },
  mLabel: { color: colors.textDim, fontSize: 10, letterSpacing: 2, marginBottom: 4 },
  mVal: { color: colors.text, fontSize: 28, fontWeight: "800" },
});
