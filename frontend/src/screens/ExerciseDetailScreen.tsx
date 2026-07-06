import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, Linking, ActivityIndicator, ScrollView, Image, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { GlassCard, NeoButton, GhostButton, H1, H2, Body, SectionLabel } from "@/src/ui";
import { colors, gradient, radius, spacing } from "@/src/theme";
import { api } from "@/src/api";

export default function ExerciseDetailScreen({
  exerciseId, onBack, onStartCheck,
}: { exerciseId: string; onBack: () => void; onStartCheck: (ex: any) => void }) {
  const [ex, setEx] = useState<any>(null);
  const [frame, setFrame] = useState(0);
  const [imgError, setImgError] = useState(false);

  useEffect(() => { api.exercise(exerciseId).then(setEx).catch(() => {}); }, [exerciseId]);

  useEffect(() => {
    if (!ex?.image_frames?.length) return;
    const t = setInterval(() => setFrame(f => (f + 1) % ex.image_frames.length), 900);
    return () => clearInterval(t);
  }, [ex]);

  const openYouTube = () => {
    const q = encodeURIComponent(ex?.youtube_query || `${ex?.name || ""} proper form`);
    Linking.openURL(`https://www.youtube.com/results?search_query=${q}`);
  };

  if (!ex) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.cyan} />
        </View>
      </SafeAreaView>
    );
  }

  const currentFrame = ex.image_frames?.[frame];

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 160 }}>
        <Pressable onPress={onBack} style={styles.back} testID="ex-back">
          <Ionicons name="chevron-back" size={22} color={colors.text} />
          <Text style={{ color: colors.text, marginLeft: 4 }}>Library</Text>
        </Pressable>

        <H1 style={{ marginTop: 6 }}>{ex.name}</H1>
        <View style={{ flexDirection: "row", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
          <View style={styles.tag}><Text style={styles.tagT}>{ex.muscle_group}</Text></View>
          <View style={styles.tag}><Text style={styles.tagT}>{ex.equipment}</Text></View>
          <View style={styles.tag}><Text style={styles.tagT}>{ex.difficulty}</Text></View>
        </View>

        {/* Demo player */}
        <View style={styles.player}>
          {currentFrame && !imgError ? (
            <Image
              source={{ uri: currentFrame }}
              onError={() => setImgError(true)}
              style={styles.demoImg}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.demoFallback}>
              <LinearGradient colors={gradient.primary} start={{x:0,y:0}} end={{x:1,y:1}} style={StyleSheet.absoluteFill} />
              <Ionicons name="barbell" size={60} color="#0B0B14" />
              <Text style={{ color: "#0B0B14", marginTop: 8, fontWeight: "700", letterSpacing: 1 }}>
                {ex.name.toUpperCase()}
              </Text>
              <Text style={{ color: "rgba(11,11,20,0.7)", marginTop: 4, fontSize: 11 }}>Animated demo unavailable — tap YouTube for full tutorial</Text>
            </View>
          )}
          {ex.image_frames?.length > 1 && !imgError && (
            <View style={styles.frameDots}>
              {ex.image_frames.map((_: any, i: number) => (
                <View key={i} style={[styles.dot, frame === i && styles.dotActive]} />
              ))}
            </View>
          )}
        </View>

        <Pressable style={styles.ytBtn} onPress={openYouTube} testID="watch-yt">
          <View style={styles.ytLogo}><Ionicons name="logo-youtube" size={18} color="#fff" /></View>
          <Text style={styles.ytText}>Watch full tutorial on YouTube</Text>
          <Ionicons name="open-outline" size={16} color={colors.textDim} />
        </Pressable>

        <SectionLabel text="Form Cues" />
        <GlassCard>
          {(ex.cues || []).map((c: string, i: number) => (
            <View key={i} style={styles.cueRow}>
              <View style={styles.cueDot} />
              <Text style={{ color: colors.text, flex: 1, lineHeight: 20 }}>{c}</Text>
            </View>
          ))}
        </GlassCard>

        <NeoButton
          label="Start AI Form Check"
          icon="scan-circle"
          onPress={() => onStartCheck(ex)}
          style={{ marginTop: spacing.xl }}
          testID="start-formcheck"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  back: { flexDirection: "row", alignItems: "center", paddingVertical: 6 },
  tag: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill,
    borderWidth: 1, borderColor: "rgba(139,92,246,0.4)",
    backgroundColor: "rgba(139,92,246,0.10)",
  },
  tagT: { color: colors.text, fontSize: 11, letterSpacing: 1, fontWeight: "700" },
  player: {
    marginTop: spacing.lg,
    borderRadius: radius.xl, overflow: "hidden",
    aspectRatio: 1.2,
    borderWidth: 1, borderColor: "rgba(139,92,246,0.35)",
    backgroundColor: colors.surface,
  },
  demoImg: { width: "100%", height: "100%" },
  demoFallback: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg },
  frameDots: {
    position: "absolute", bottom: 10, left: 0, right: 0,
    flexDirection: "row", justifyContent: "center", gap: 6,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.4)" },
  dotActive: { backgroundColor: colors.cyan, shadowColor: colors.cyan, shadowOpacity: 1, shadowRadius: 6 },
  ytBtn: {
    marginTop: spacing.md,
    flexDirection: "row", alignItems: "center", gap: 10,
    padding: 14, borderRadius: radius.xl,
    backgroundColor: "rgba(240,240,255,0.05)",
    borderWidth: 1, borderColor: "rgba(139,92,246,0.3)",
  },
  ytLogo: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: "#FF0000",
    alignItems: "center", justifyContent: "center",
  },
  ytText: { color: colors.text, flex: 1, fontWeight: "600" },
  cueRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 8 },
  cueDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.cyan, marginTop: 8 },
});
