import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Modal, ActivityIndicator, Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { GlassCard, NeoButton, GhostButton, H1, H2, Body, SectionLabel } from "@/src/ui";
import { colors, gradient, radius, spacing } from "@/src/theme";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth";

const QUICK_FOODS = [
  { name: "Chicken Breast (200g)", calories: 330, protein: 62, carbs: 0, fats: 7 },
  { name: "Brown Rice (1 cup)", calories: 216, protein: 5, carbs: 45, fats: 2 },
  { name: "Whey Protein Scoop", calories: 120, protein: 25, carbs: 3, fats: 1 },
  { name: "Sweet Potato (200g)", calories: 172, protein: 4, carbs: 40, fats: 0 },
  { name: "Salmon (150g)", calories: 280, protein: 30, carbs: 0, fats: 18 },
  { name: "Greek Yogurt (200g)", calories: 130, protein: 20, carbs: 8, fats: 4 },
];

export default function NutritionScreen() {
  const { user, refresh } = useAuth();
  const [data, setData] = useState<any>({ calories: 0, protein: 0, carbs: 0, fats: 0, water_ml: 0, meals: [] });
  const [showAdd, setShowAdd] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [manualForm, setManualForm] = useState<any>({ name: "", calories: "", protein: "", carbs: "", fats: "" });
  const [manualMode, setManualMode] = useState(false);
  const [targets, setTargets] = useState<any>(null);
  const [confirmDelete, setConfirmDelete] = useState<any>(null);
  const [showGoal, setShowGoal] = useState(false);

  const goal = user?.goal || "maintain";

  const load = async () => {
    try {
      const [n, t] = await Promise.all([api.nutritionToday(), api.getTargets()]);
      setData(n); setTargets(t);
    } catch {}
  };
  useEffect(() => { load(); }, []);

  const target = {
    calories: targets?.calorie_target || 2400,
    protein: targets?.protein_target || 180,
    carbs: targets?.carbs_target || 260,
    fats: targets?.fats_target || 70,
    water: 3000,
  };

  const logQuick = async (food: any) => {
    await api.logFood(food);
    await load();
  };
  const logWater = async () => {
    const today = new Date().toISOString().slice(0, 10);
    await api.logNutrition({ date: today, meals: [], water_ml: 250 });
    await load();
  };

  const pickPhoto = async (source: "camera" | "library") => {
    let perm;
    if (source === "camera") perm = await ImagePicker.requestCameraPermissionsAsync();
    else perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { alert("Permission required"); return; }
    const opts: ImagePicker.ImagePickerOptions = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true, quality: 0.6,
    };
    const result = source === "camera"
      ? await ImagePicker.launchCameraAsync(opts)
      : await ImagePicker.launchImageLibraryAsync(opts);
    if (result.canceled || !result.assets?.[0]?.base64) return;
    const b64 = result.assets[0].base64;
    setShowAdd(false); setScanning(true); setScanResult(null);
    try {
      const r = await api.scanFood(b64);
      setScanResult({
        name: r.name || "Unknown food",
        portion: r.portion || "1 serving",
        calories: Number(r.calories) || 0,
        protein: Number(r.protein) || 0,
        carbs: Number(r.carbs) || 0,
        fats: Number(r.fats) || 0,
        confidence: r.confidence || "medium",
        image: `data:image/jpeg;base64,${b64}`,
        error: r.error,
        ok: r.ok,
      });
    } catch (e: any) {
      setScanResult({ error: e.message || "Scan failed", name: "", calories: 0, protein: 0, carbs: 0, fats: 0 });
    }
    setScanning(false);
  };

  const confirmScan = async () => {
    if (!scanResult) return;
    await api.logFood({
      name: scanResult.name, calories: Math.round(scanResult.calories),
      protein: scanResult.protein, carbs: scanResult.carbs, fats: scanResult.fats,
      portion: scanResult.portion,
    });
    setScanResult(null);
    await load();
  };

  const logManual = async () => {
    if (!manualForm.name) return;
    await api.logFood({
      name: manualForm.name,
      calories: parseInt(manualForm.calories) || 0,
      protein: parseFloat(manualForm.protein) || 0,
      carbs: parseFloat(manualForm.carbs) || 0,
      fats: parseFloat(manualForm.fats) || 0,
    });
    setManualMode(false); setShowAdd(false);
    setManualForm({ name: "", calories: "", protein: "", carbs: "", fats: "" });
    await load();
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    const today = new Date().toISOString().slice(0, 10);
    await api.deleteMeal(today, confirmDelete.name, confirmDelete.time);
    setConfirmDelete(null);
    await load();
  };

  const changeGoal = async (g: string) => {
    await api.setGoal(g);
    await refresh();
    await load();
    setShowGoal(false);
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 160 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: spacing.md }}>
          <View>
            <Text style={{ color: colors.textDim, fontSize: 11, letterSpacing: 3 }}>FUEL</Text>
            <H1>Cosmic Macros</H1>
          </View>
          <Pressable style={styles.goalPill} onPress={() => setShowGoal(true)} testID="goal-picker">
            <Ionicons name="flag" size={14} color={colors.magenta} />
            <Text style={{ color: colors.text, fontWeight: "800", fontSize: 12, marginLeft: 6, letterSpacing: 1 }}>
              {goal === "cut" ? "CUTTING" : goal === "bulk" ? "BULKING" : "MAINTAIN"}
            </Text>
          </Pressable>
        </View>

        <GlassCard>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.lg }}>
            <MacroRing calories={data.calories} target={target.calories} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textDim, fontSize: 11, letterSpacing: 2 }}>REMAINING</Text>
              <Text style={styles.remaining}>{Math.max(0, target.calories - data.calories)}</Text>
              <Text style={{ color: colors.textDim, fontSize: 11 }}>of {target.calories} kcal</Text>
              {targets?.method && (
                <Text style={{ color: colors.textFaint, fontSize: 10, marginTop: 4 }}>
                  BMR {targets.bmr} · TDEE {targets.tdee} · {targets.method}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.macroRow}>
            <MacroBar label="Protein" value={data.protein} target={target.protein} color={colors.magenta} />
            <MacroBar label="Carbs" value={data.carbs} target={target.carbs} color={colors.cyan} />
            <MacroBar label="Fats" value={data.fats} target={target.fats} color={colors.violet} />
          </View>
        </GlassCard>

        <GlassCard style={{ marginTop: spacing.md }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="water" size={20} color={colors.cyan} />
              <Text style={{ color: colors.text, fontWeight: "700" }}>Hydration</Text>
            </View>
            <Text style={{ color: colors.cyan, fontWeight: "800" }}>{data.water_ml} / {target.water} ml</Text>
          </View>
          <View style={styles.waterBar}>
            <LinearGradient colors={gradient.primary} start={{x:0,y:0}} end={{x:1,y:0}}
              style={{ width: `${Math.min(100, data.water_ml / target.water * 100)}%`, height: "100%", borderRadius: 999 }} />
          </View>
          <View style={{ flexDirection: "row", gap: 8, marginTop: spacing.md }}>
            <GhostButton label="+250 ml" icon="water" onPress={logWater} testID="log-water" />
          </View>
        </GlassCard>

        {data.meals?.length > 0 && (
          <>
            <SectionLabel text="Today's Meals" />
            <GlassCard>
              {data.meals.map((m: any, i: number) => (
                <View key={i} style={styles.mealRow}>
                  <View style={styles.foodDot} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: "600" }}>{m.name}</Text>
                    {m.time && <Text style={{ color: colors.textDim, fontSize: 11 }}>{m.time}</Text>}
                  </View>
                  <Text style={{ color: colors.cyan, fontWeight: "700", marginRight: 10 }}>{m.calories} kcal</Text>
                  <Pressable onPress={() => setConfirmDelete(m)} style={styles.trash} testID={`del-meal-${i}`}>
                    <Ionicons name="trash-outline" size={16} color={colors.red} />
                  </Pressable>
                </View>
              ))}
            </GlassCard>
          </>
        )}

        <SectionLabel text="Quick Log" />
        <View style={{ gap: spacing.sm }}>
          {QUICK_FOODS.map((f, i) => (
            <Pressable key={i} style={styles.foodRow} onPress={() => logQuick(f)} testID={`food-${i}`}>
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
      </ScrollView>

      {/* Floating + button */}
      <Pressable onPress={() => setShowAdd(true)} style={styles.fab} testID="nutrition-fab">
        <LinearGradient colors={gradient.primary} start={{x:0,y:0}} end={{x:1,y:1}} style={StyleSheet.absoluteFill} />
        <Ionicons name="add" size={30} color="#0B0B14" />
      </Pressable>

      {/* Add sheet */}
      <Modal visible={showAdd} transparent animationType="slide" onRequestClose={() => setShowAdd(false)}>
        <View style={styles.modalBg}>
          <View style={styles.sheet}>
            <View style={styles.grabber} />
            <H2 style={{ marginBottom: spacing.md }}>Log Food</H2>
            {!manualMode ? (
              <>
                <Pressable style={styles.actionRow} onPress={() => pickPhoto("camera")} testID="scan-camera">
                  <View style={[styles.actionIcon, { backgroundColor: "rgba(139,92,246,0.15)" }]}>
                    <Ionicons name="camera" size={22} color={colors.violet} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: "700" }}>Scan with Camera</Text>
                    <Text style={{ color: colors.textDim, fontSize: 12 }}>AI identifies food + macros</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textDim} />
                </Pressable>
                <Pressable style={styles.actionRow} onPress={() => pickPhoto("library")} testID="scan-gallery">
                  <View style={[styles.actionIcon, { backgroundColor: "rgba(34,211,238,0.15)" }]}>
                    <Ionicons name="images" size={22} color={colors.cyan} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: "700" }}>Pick from Gallery</Text>
                    <Text style={{ color: colors.textDim, fontSize: 12 }}>Choose an existing food photo</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textDim} />
                </Pressable>
                <Pressable style={styles.actionRow} onPress={() => setManualMode(true)} testID="scan-manual">
                  <View style={[styles.actionIcon, { backgroundColor: "rgba(232,121,249,0.15)" }]}>
                    <Ionicons name="create" size={22} color={colors.magenta} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: "700" }}>Enter Manually</Text>
                    <Text style={{ color: colors.textDim, fontSize: 12 }}>Type name and macros</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textDim} />
                </Pressable>
                <GhostButton label="Cancel" onPress={() => setShowAdd(false)} style={{ marginTop: spacing.md }} testID="add-cancel" />
              </>
            ) : (
              <View>
                <ManualField label="Food name" v={manualForm.name} onChange={(x: string) => setManualForm({ ...manualForm, name: x })} />
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <ManualField label="Calories" v={manualForm.calories} onChange={(x: string) => setManualForm({ ...manualForm, calories: x })} keyboardType="numeric" />
                  <ManualField label="Protein g" v={manualForm.protein} onChange={(x: string) => setManualForm({ ...manualForm, protein: x })} keyboardType="numeric" />
                </View>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <ManualField label="Carbs g" v={manualForm.carbs} onChange={(x: string) => setManualForm({ ...manualForm, carbs: x })} keyboardType="numeric" />
                  <ManualField label="Fats g" v={manualForm.fats} onChange={(x: string) => setManualForm({ ...manualForm, fats: x })} keyboardType="numeric" />
                </View>
                <NeoButton label="Save" icon="checkmark" onPress={logManual} style={{ marginTop: spacing.md }} testID="manual-save" />
                <GhostButton label="Back" onPress={() => setManualMode(false)} style={{ marginTop: 8 }} testID="manual-back" />
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Scanning overlay */}
      <Modal visible={scanning} transparent>
        <View style={styles.modalBg}>
          <View style={styles.scanBox}>
            <ActivityIndicator size="large" color={colors.cyan} />
            <Text style={{ color: colors.text, marginTop: 16, fontWeight: "700" }}>Analyzing food…</Text>
            <Text style={{ color: colors.textDim, marginTop: 4, fontSize: 12, textAlign: "center" }}>
              Claude Sonnet 4.6 vision is identifying{'\n'}calories and macros from your photo
            </Text>
          </View>
        </View>
      </Modal>

      {/* Scan result */}
      <Modal visible={!!scanResult} transparent animationType="slide" onRequestClose={() => setScanResult(null)}>
        <View style={styles.modalBg}>
          <View style={styles.sheet}>
            <View style={styles.grabber} />
            <H2 style={{ marginBottom: spacing.md }}>Confirm Estimate</H2>
            {scanResult?.error ? (
              <View style={{ marginBottom: spacing.md, padding: spacing.md, backgroundColor: "rgba(244,63,94,0.1)", borderRadius: radius.md, borderWidth: 1, borderColor: "rgba(244,63,94,0.35)" }}>
                <Text style={{ color: colors.red, fontWeight: "700", marginBottom: 4 }}>Vision AI unavailable</Text>
                <Text style={{ color: colors.textDim, fontSize: 12 }}>{scanResult.error}. Showing defaults — edit and save.</Text>
              </View>
            ) : (
              <Text style={{ color: colors.textDim, fontSize: 12, marginBottom: spacing.md }}>
                Confidence: {scanResult?.confidence?.toUpperCase()} · you can edit before saving
              </Text>
            )}
            <ManualField label="Food name" v={scanResult?.name || ""} onChange={(x: string) => setScanResult({ ...scanResult, name: x })} />
            <ManualField label="Portion" v={scanResult?.portion || ""} onChange={(x: string) => setScanResult({ ...scanResult, portion: x })} />
            <View style={{ flexDirection: "row", gap: 8 }}>
              <ManualField label="Calories" v={String(scanResult?.calories || 0)} onChange={(x: string) => setScanResult({ ...scanResult, calories: parseInt(x) || 0 })} keyboardType="numeric" />
              <ManualField label="Protein g" v={String(scanResult?.protein || 0)} onChange={(x: string) => setScanResult({ ...scanResult, protein: parseFloat(x) || 0 })} keyboardType="numeric" />
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <ManualField label="Carbs g" v={String(scanResult?.carbs || 0)} onChange={(x: string) => setScanResult({ ...scanResult, carbs: parseFloat(x) || 0 })} keyboardType="numeric" />
              <ManualField label="Fats g" v={String(scanResult?.fats || 0)} onChange={(x: string) => setScanResult({ ...scanResult, fats: parseFloat(x) || 0 })} keyboardType="numeric" />
            </View>
            <NeoButton label="Add to Log" icon="checkmark-circle" onPress={confirmScan} style={{ marginTop: spacing.md }} testID="scan-confirm" />
            <GhostButton label="Discard" onPress={() => setScanResult(null)} style={{ marginTop: 8 }} testID="scan-discard" />
          </View>
        </View>
      </Modal>
      {/* Goal picker */}
      <Modal visible={showGoal} transparent animationType="slide" onRequestClose={() => setShowGoal(false)}>
        <View style={styles.modalBg}>
          <View style={styles.sheet}>
            <View style={styles.grabber} />
            <H2 style={{ marginBottom: 6 }}>Your goal</H2>
            <Text style={{ color: colors.textDim, marginBottom: spacing.lg, fontSize: 12 }}>
              We'll recalculate your calorie + macro targets from your body stats using Katch-McArdle.
            </Text>
            {[
              { id: "cut", label: "Cutting", desc: "Lose fat (TDEE − 500)" },
              { id: "maintain", label: "Maintaining", desc: "Hold current physique" },
              { id: "bulk", label: "Bulking", desc: "Gain lean muscle (TDEE + 400)" },
            ].map(g => (
              <Pressable key={g.id} onPress={() => changeGoal(g.id)}
                style={[styles.actionRow, goal === g.id && { borderColor: colors.cyan, backgroundColor: "rgba(34,211,238,0.08)" }]}
                testID={`goal-${g.id}`}>
                <View style={[styles.actionIcon, { backgroundColor: "rgba(232,121,249,0.15)" }]}>
                  <Ionicons name={g.id === "cut" ? "trending-down" : g.id === "bulk" ? "trending-up" : "remove"} size={22} color={colors.magenta} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: "700" }}>{g.label}</Text>
                  <Text style={{ color: colors.textDim, fontSize: 12 }}>{g.desc}</Text>
                </View>
                {goal === g.id && <Ionicons name="checkmark-circle" size={22} color={colors.cyan} />}
              </Pressable>
            ))}
            <GhostButton label="Close" onPress={() => setShowGoal(false)} style={{ marginTop: spacing.md }} testID="goal-close" />
          </View>
        </View>
      </Modal>

      {/* Delete meal confirm */}
      <Modal visible={!!confirmDelete} transparent animationType="fade" onRequestClose={() => setConfirmDelete(null)}>
        <View style={[styles.modalBg, { justifyContent: "center", padding: spacing.xl }]}>
          <View style={[styles.sheet, { borderRadius: radius.xl, paddingBottom: spacing.xl }]}>
            <Ionicons name="warning" size={32} color={colors.red} style={{ alignSelf: "center", marginBottom: 8 }} />
            <H2 style={{ textAlign: "center", marginBottom: 8 }}>Remove meal?</H2>
            <Text style={{ color: colors.textDim, textAlign: "center", marginBottom: spacing.lg }}>
              {confirmDelete?.name} ({confirmDelete?.calories} kcal){"\n"}will be removed from today's log.
            </Text>
            <NeoButton label="Remove" icon="trash" onPress={doDelete} testID="confirm-delete" />
            <GhostButton label="Cancel" onPress={() => setConfirmDelete(null)} style={{ marginTop: 8 }} testID="cancel-delete" />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function ManualField({ label, v, onChange, keyboardType }: any) {
  return (
    <View style={{ flex: 1, marginBottom: 10 }}>
      <Text style={{ color: colors.textDim, fontSize: 10, letterSpacing: 2, marginBottom: 4 }}>{label.toUpperCase()}</Text>
      <TextInput
        value={String(v)} onChangeText={onChange} keyboardType={keyboardType}
        placeholder={label} placeholderTextColor={colors.textFaint}
        style={{
          backgroundColor: "rgba(11,11,20,0.6)", color: colors.text,
          borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10,
          borderWidth: 1, borderColor: "rgba(139,92,246,0.25)", fontSize: 15,
        }}
      />
    </View>
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
        <Text style={{ color: colors.text, fontSize: 26, fontWeight: "800" }}>{Math.round(calories)}</Text>
        <Text style={{ color: colors.textDim, fontSize: 10 }}>kcal</Text>
      </View>
    </View>
  );
}

function MacroBar({ label, value, target, color }: any) {
  const pct = Math.min(100, (value / target) * 100);
  return (
    <View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
        <Text style={{ color: colors.textDim, fontSize: 11, letterSpacing: 1 }}>{label.toUpperCase()}</Text>
        <Text style={{ color: colors.text, fontSize: 11, fontWeight: "700" }}>{Math.round(value)}/{target}g</Text>
      </View>
      <View style={{ height: 6, backgroundColor: "rgba(139,92,246,0.15)", borderRadius: 3, overflow: "hidden" }}>
        <View style={{ width: `${pct}%`, height: "100%", backgroundColor: color, borderRadius: 3 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  remaining: { color: colors.text, fontSize: 40, fontWeight: "800" },
  macroRow: { gap: spacing.sm, marginTop: spacing.lg },
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
  foodDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.cyan },
  trash: {
    width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(244,63,94,0.35)",
    backgroundColor: "rgba(244,63,94,0.08)",
  },
  goalPill: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill,
    borderWidth: 1, borderColor: "rgba(232,121,249,0.4)",
    backgroundColor: "rgba(232,121,249,0.10)",
  },
  fab: {
    position: "absolute", right: 20, bottom: 110,
    width: 60, height: 60, borderRadius: 30, overflow: "hidden",
    alignItems: "center", justifyContent: "center",
    shadowColor: colors.violet, shadowOpacity: 0.7, shadowRadius: 15, elevation: 12,
  },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#131226", padding: spacing.xl, paddingBottom: 40,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderTopWidth: 1, borderColor: "rgba(139,92,246,0.3)",
    maxHeight: "88%",
  },
  grabber: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.textFaint, alignSelf: "center", marginBottom: spacing.lg },
  actionRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 14, borderRadius: radius.lg,
    backgroundColor: "rgba(240,240,255,0.04)",
    borderWidth: 1, borderColor: "rgba(139,92,246,0.2)",
    marginBottom: spacing.sm,
  },
  actionIcon: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: "center", justifyContent: "center",
  },
  scanBox: {
    alignSelf: "center", padding: spacing.xxl, borderRadius: radius.xl,
    backgroundColor: "#131226",
    borderWidth: 1, borderColor: "rgba(139,92,246,0.35)",
    alignItems: "center", margin: 40,
  },
});
