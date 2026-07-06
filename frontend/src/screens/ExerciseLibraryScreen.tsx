import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, FlatList, TextInput, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { GlassCard, H1, Chip } from "@/src/ui";
import { colors, gradient, radius, spacing } from "@/src/theme";
import { api } from "@/src/api";
import ExerciseDetailScreen from "@/src/screens/ExerciseDetailScreen";
import FormCheckScreen from "@/src/screens/FormCheckScreen";

const MUSCLES = ["All", "Chest", "Back", "Legs", "Shoulders", "Arms", "Core"];

export default function ExerciseLibraryScreen({ onBack }: { onBack: () => void }) {
  const [items, setItems] = useState<any[]>([]);
  const [muscle, setMuscle] = useState("All");
  const [q, setQ] = useState("");
  const [beginner, setBeginner] = useState(false);
  const [detail, setDetail] = useState<string | null>(null);
  const [formCheck, setFormCheck] = useState<any>(null);

  useEffect(() => {
    api.exercises(muscle, q, beginner).then(setItems).catch(() => {});
  }, [muscle, q, beginner]);

  if (formCheck) {
    return <FormCheckScreen exercise={formCheck} onClose={() => setFormCheck(null)} />;
  }
  if (detail) {
    return <ExerciseDetailScreen exerciseId={detail}
      onBack={() => setDetail(null)}
      onStartCheck={(ex) => { setDetail(null); setFormCheck(ex); }} />;
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
      <View style={{ padding: spacing.lg, paddingBottom: 0 }}>
        <Pressable onPress={onBack} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 6 }} testID="lib-back">
          <Ionicons name="chevron-back" size={22} color={colors.text} />
          <Text style={{ color: colors.text, marginLeft: 4 }}>Back</Text>
        </Pressable>
        <H1 style={{ marginTop: 4 }}>Exercise Library</H1>
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={colors.textDim} />
          <TextInput
            value={q} onChangeText={setQ}
            placeholder="Search exercises…"
            placeholderTextColor={colors.textFaint}
            style={{ flex: 1, color: colors.text, marginLeft: 8 }}
            testID="lib-search"
          />
          <Pressable onPress={() => setBeginner(b => !b)} style={[styles.beginPill, beginner && styles.beginPillActive]} testID="lib-beginner">
            <Ionicons name={beginner ? "sparkles" : "sparkles-outline"} size={12} color={beginner ? "#0B0B14" : colors.text} />
            <Text style={{ color: beginner ? "#0B0B14" : colors.text, fontSize: 10, fontWeight: "800", letterSpacing: 1 }}>BEGINNER</Text>
          </Pressable>
        </View>
        <View style={{ height: 56, marginTop: spacing.md }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 4 }}>
            {MUSCLES.map(m => (
              <Chip key={m} label={m} active={muscle === m} onPress={() => setMuscle(m)} testID={`chip-${m}`} />
            ))}
          </ScrollView>
        </View>
      </View>
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140, gap: spacing.md }}
        renderItem={({ item }) => (
          <Pressable onPress={() => setDetail(item.id)} testID={`lib-${item.id}`}>
            <GlassCard>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={styles.thumb}>
                  {item.image_frames?.[0] ? (
                    <Image source={{ uri: item.image_frames[0] }} style={{ width: "100%", height: "100%" }} />
                  ) : (
                    <LinearGradient colors={gradient.primary} start={{x:0,y:0}} end={{x:1,y:1}} style={StyleSheet.absoluteFill} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={{ color: colors.text, fontWeight: "700", fontSize: 15 }}>{item.name}</Text>
                    {item.beginner_friendly && (
                      <View style={styles.begTag}><Text style={{ color: colors.green, fontSize: 8, letterSpacing: 1, fontWeight: "800" }}>BEG</Text></View>
                    )}
                  </View>
                  <Text style={{ color: colors.textDim, fontSize: 12, marginTop: 2 }}>
                    {item.muscle_group} · {item.equipment} · {item.difficulty}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textDim} />
              </View>
            </GlassCard>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(11,11,20,0.6)", borderRadius: radius.lg,
    paddingHorizontal: 12, paddingVertical: 10, marginTop: spacing.md,
    borderWidth: 1, borderColor: "rgba(139,92,246,0.2)",
  },
  thumb: {
    width: 60, height: 60, borderRadius: radius.md, overflow: "hidden",
    backgroundColor: colors.surface,
    alignItems: "center", justifyContent: "center",
  },
  beginPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill,
    borderWidth: 1, borderColor: "rgba(139,92,246,0.35)",
  },
  beginPillActive: { backgroundColor: colors.cyan, borderColor: colors.cyan },
  begTag: {
    paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4,
    backgroundColor: "rgba(74,222,128,0.15)", borderWidth: 1, borderColor: "rgba(74,222,128,0.4)",
  },
});
