import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { GlassCard, NeoButton, GhostButton, H1, H2, Body, StatCard, SectionLabel } from "@/src/ui";
import { colors, gradient, radius, spacing } from "@/src/theme";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth";

const FOODS = [
  { name: "Chicken Breast (200g)", calories: 330, protein: 62, carbs: 0, fats: 7 },
  { name: "Brown Rice (1 cup)", calories: 216, protein: 5, carbs: 45, fats: 2 },
  { name: "Broccoli (100g)", calories: 34, protein: 3, carbs: 7, fats: 0 },
  { name: "Whey Protein Scoop", calories: 120, protein: 25, carbs: 3, fats: 1 },
  { name: "Sweet Potato (200g)", calories: 172, protein: 4, carbs: 40, fats: 0 },
  { name: "Avocado (half)", calories: 160, protein: 2, carbs: 9, fats: 15 },
  { name: "Salmon (150g)", calories: 280, protein: 30, carbs: 0, fats: 18 },
  { name: "Greek Yogurt (200g)", calories: 130, protein: 20, carbs: 8, fats: 4 },
];

export default function NutritionScreen() {
  const { user } = useAuth();
  const [data, setData] = useState<any>({ calories: 0, protein: 0, carbs: 0, fats: 0, water_ml: 0, meals: [] });
  const [showLog, setShowLog] = useState(false);

  const target = { calories: 2400, protein: 180, carbs: 260, fats: 70, water: 3000 };
  const goal = user?.goal || "maintain";

  const load = async () => { try { setData(await api.nutritionToday()); } catch {} };
  useEffect(() => { load(); }, []);

  const logFood = async (food: any) => {
    const today = new Date().toISOString().slice(0, 10);
    await api.logNutrition({ date: today, meals: [{ ...food, time: new Date().toLocaleTimeString() }], water_ml: 0 });
    await load();
  };
  const logWater = async () => {
    const today = new Date().toISOString().slice(0, 10);
    await api.logNutrition({ date: today, meals: [], water_ml: 250 });
    await load();
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140 }}>
        <View style={{ marginBottom: spacing.md }}>
          <Text style={{ color: colors.textDim, fontSize: 11, letterSpacing: 3 }}>FUEL</Text>
          <H1>Cosmic Macros</H1>
        </View>

        <GlassCard>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.lg }}>
            <MacroRing calories={data.calories} target={target.calories} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textDim, fontSize: 11, letterSpacing: 2 }}>REMAINING</Text>
              <Text style={styles.remaining}>{Math.max(0, target.calories - data.calories)}</Text>
              <Text style={{ color: colors.textDim, fontSize: 11 }}>kcal · {goal.toUpperCase()}</Text>
            </View>
          </View>
          <View style={styles.macroRow}>
            <MacroBar label="Protein" value={data.protein} target={target.protein} color={colors.magenta} unit="g" />
            <MacroBar label="Carbs" value={data.carbs} target={target.carbs} color={colors.cyan} unit="g" />
            <MacroBar label="Fats" value={data.fats} target={target.fats} color={colors.violet} unit="g" />
          </View>
        </GlassCard>

        <GlassCard style={{ marginTop: spacing.md }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="water" size={20} color={colors.cyan} />
              <Text style={{ color: colors.text, fontWeight: "700" }}>Hydration</Text>
            </View>
            <Text style={{ color: colors.cyan, fontWeight: "800", fontSize: 18 }}>{data.water_ml} / {target.water} ml</Text>
          </View>
          <View style={styles.waterBar}>
            <LinearGradient colors={gradient.primary} start={{x:0,y:0}} end={{x:1,y:0}}
              style={{ width: `${Math.min(100, data.water_ml / target.water * 100)}%`, height: "100%", borderRadius: 999 }} />
          </View>
          <View style={{ flexDirection: "row", gap: 8, marginTop: spacing.md }}>
            <GhostButton label="+250 ml" icon="water" onPress={logWater} testID="log-water" />
          </View>
        </GlassCard>

        <SectionLabel text="Quick Log" />
        <View style={{ gap: spacing.sm }}>
          {FOODS.map((f, i) => (
            <Pressable key={i} style={styles.foodRow} onPress={() => logFood(f)} testID={`food-${i}`}>
              <View style={styles.foodIcon}>
                <Ionicons name="nutrition" size={18} color={colors.cyan} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: "600" }}>{f.name}</Text>
                <Text style={{ color: colors.textDim, fontSize: 12 }}>{f.calories} kcal · P{f.protein} C{f.carbs} F{f.fats}</Text>
              </View>
              <Ionicons name="add-circle" size={26} color={colors.violet} />
            </Pressable>
          ))}
        </View>

        {data.meals?.length > 0 && (
          <>
            <SectionLabel text="Today's Meals" />
            <GlassCard>
              {data.meals.map((m: any, i: number) => (
                <View key={i} style={styles.mealRow}>
                  <View style={styles.foodDot} />
                  <Text style={{ color: colors.text, flex: 1 }}>{m.name}</Text>
                  <Text style={{ color: colors.cyan, fontWeight: "700" }}>{m.calories} kcal</Text>
                </View>
              ))}
            </GlassCard>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function MacroRing({ calories, target }: { calories: number; target: number }) {
  const pct = Math.min(1, calories / target);
  return (
    <View style={{ width: 120, height: 120, alignItems: "center", justifyContent: "center" }}>
      <LinearGradient
        colors={gradient.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ width: 120, height: 120, borderRadius: 60, opacity: 0.3 + pct * 0.7 }}
      />
      <View style={{
        position: "absolute", top: 8, left: 8, right: 8, bottom: 8,
        borderRadius: 52, backgroundColor: colors.surface,
        alignItems: "center", justifyContent: "center",
      }}>
        <Text style={{ color: colors.text, fontSize: 26, fontWeight: "800" }}>{calories}</Text>
        <Text style={{ color: colors.textDim, fontSize: 10 }}>kcal</Text>
      </View>
    </View>
  );
}

function MacroBar({ label, value, target, color, unit }: any) {
  const pct = Math.min(100, (value / target) * 100);
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
        <Text style={{ color: colors.textDim, fontSize: 11, letterSpacing: 1 }}>{label.toUpperCase()}</Text>
        <Text style={{ color: colors.text, fontSize: 11, fontWeight: "700" }}>{Math.round(value)}/{target}{unit}</Text>
      </View>
      <View style={{ height: 6, backgroundColor: "rgba(139,92,246,0.15)", borderRadius: 3, overflow: "hidden" }}>
        <View style={{ width: `${pct}%`, height: "100%", backgroundColor: color, borderRadius: 3 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  remaining: { color: colors.text, fontSize: 40, fontWeight: "800" },
  macroRow: { flexDirection: "column", gap: spacing.sm, marginTop: spacing.lg },
  waterBar: { height: 12, backgroundColor: "rgba(34,211,238,0.15)", borderRadius: 999, overflow: "hidden" },
  foodRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 14, borderRadius: radius.lg,
    backgroundColor: "rgba(240,240,255,0.03)",
    borderWidth: 1, borderColor: "rgba(139,92,246,0.15)",
  },
  foodIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(34,211,238,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  mealRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "rgba(139,92,246,0.12)",
  },
  foodDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.cyan },
});
