import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, FlatList, TextInput } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { GlassCard, H1, H2, Body, Chip, SectionLabel } from "@/src/ui";
import { colors, gradient, radius, spacing } from "@/src/theme";
import { api } from "@/src/api";

const MUSCLES = ["All", "Chest", "Back", "Legs", "Shoulders", "Arms", "Core"];

export default function ExerciseLibraryScreen({ onBack }: { onBack: () => void }) {
  const [items, setItems] = useState<any[]>([]);
  const [muscle, setMuscle] = useState("All");
  const [q, setQ] = useState("");

  useEffect(() => {
    api.exercises(muscle, q).then(setItems).catch(() => {});
  }, [muscle, q]);

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
          <GlassCard testID={`lib-${item.id}`}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={styles.iconWrap}>
                <LinearGradient colors={gradient.primary} start={{x:0,y:0}} end={{x:1,y:1}} style={StyleSheet.absoluteFill} />
                <Ionicons name="barbell" size={22} color="#0B0B14" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: "700", fontSize: 15 }}>{item.name}</Text>
                <Text style={{ color: colors.textDim, fontSize: 12, marginTop: 2 }}>
                  {item.muscle_group} · {item.equipment} · {item.difficulty}
                </Text>
              </View>
            </View>
            <View style={{ marginTop: 10, gap: 4 }}>
              {(item.cues || []).map((c: string, i: number) => (
                <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", gap: 6 }}>
                  <View style={styles.dot} />
                  <Text style={{ color: colors.textDim, fontSize: 12, flex: 1 }}>{c}</Text>
                </View>
              ))}
            </View>
          </GlassCard>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(11,11,20,0.6)", borderRadius: radius.lg,
    paddingHorizontal: 12, paddingVertical: 10, marginTop: spacing.md,
    borderWidth: 1, borderColor: "rgba(139,92,246,0.2)",
  },
  iconWrap: { width: 46, height: 46, borderRadius: 23, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.cyan, marginTop: 6 },
});
