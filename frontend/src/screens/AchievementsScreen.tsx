import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { GlassCard, H1, H2, Body, SectionLabel } from "@/src/ui";
import { colors, gradient, radius, spacing } from "@/src/theme";
import { api } from "@/src/api";

export default function AchievementsScreen({ onBack }: { onBack: () => void }) {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { api.achievements().then(setItems).catch(() => {}); }, []);

  const unlocked = items.filter(i => i.unlocked).length;

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140 }}>
        <Pressable onPress={onBack} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 6 }} testID="ach-back">
          <Ionicons name="chevron-back" size={22} color={colors.text} />
          <Text style={{ color: colors.text, marginLeft: 4 }}>Back</Text>
        </Pressable>
        <H1 style={{ marginTop: 4 }}>Galactic Achievements</H1>
        <Body dim>{unlocked} of {items.length} unlocked</Body>

        <View style={styles.grid}>
          {items.map(b => (
            <View key={b.id} style={styles.badge} testID={`badge-${b.id}`}>
              {b.unlocked ? (
                <LinearGradient
                  colors={["rgba(139,92,246,0.35)", "rgba(34,211,238,0.25)"] as any}
                  style={StyleSheet.absoluteFill}
                />
              ) : null}
              <View style={[styles.badgeIcon, !b.unlocked && { opacity: 0.35 }]}>
                {b.unlocked ? (
                  <LinearGradient colors={gradient.primary} start={{x:0,y:0}} end={{x:1,y:1}} style={StyleSheet.absoluteFill} />
                ) : (
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.surface }]} />
                )}
                <Ionicons name={b.icon as any} size={22} color={b.unlocked ? "#0B0B14" : colors.textFaint} />
              </View>
              <Text style={[styles.badgeTitle, !b.unlocked && { opacity: 0.5 }]}>{b.title}</Text>
              <Text style={[styles.badgeDesc, !b.unlocked && { opacity: 0.4 }]}>{b.desc}</Text>
              {b.unlocked && (
                <View style={styles.unlockedPill}>
                  <Text style={{ color: colors.green, fontSize: 9, letterSpacing: 1, fontWeight: "800" }}>UNLOCKED</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: spacing.md },
  badge: {
    width: "47%", padding: spacing.lg, borderRadius: radius.xl, overflow: "hidden",
    borderWidth: 1, borderColor: "rgba(139,92,246,0.25)",
    backgroundColor: "rgba(240,240,255,0.03)",
    alignItems: "center", minHeight: 160,
  },
  badgeIcon: {
    width: 54, height: 54, borderRadius: 27, overflow: "hidden",
    alignItems: "center", justifyContent: "center", marginBottom: 10,
  },
  badgeTitle: { color: colors.text, fontWeight: "700", fontSize: 14, textAlign: "center" },
  badgeDesc: { color: colors.textDim, fontSize: 11, textAlign: "center", marginTop: 4 },
  unlockedPill: {
    position: "absolute", top: 8, right: 8,
    paddingHorizontal: 6, paddingVertical: 3, borderRadius: 999,
    backgroundColor: "rgba(74,222,128,0.15)",
    borderWidth: 1, borderColor: "rgba(74,222,128,0.4)",
  },
});
