import React from "react";
import { View, Text, Pressable, StyleSheet, ViewStyle, TextStyle, ScrollView, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { colors, gradient, radius, spacing, font } from "./theme";

const { width: SCREEN_W } = Dimensions.get("window");

export function CosmicBackground({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient colors={gradient.bg} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={gradient.nebula}
        start={{ x: 0.1, y: 0 }} end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={["transparent", "rgba(232,121,249,0.10)", "transparent"] as any}
        start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </View>
  );
}

export function GlassCard({
  children, style, testID,
}: { children: React.ReactNode; style?: ViewStyle; testID?: string }) {
  return (
    <View testID={testID} style={[glassStyles.wrap, style]}>
      <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={["rgba(139,92,246,0.10)", "rgba(34,211,238,0.06)"] as any}
        style={StyleSheet.absoluteFill}
      />
      <View style={glassStyles.border} pointerEvents="none" />
      <View style={{ padding: spacing.lg }}>{children}</View>
    </View>
  );
}

export function NeoButton({
  label, onPress, gradientFill = true, style, textStyle, icon, testID, disabled,
}: {
  label: string; onPress: () => void; gradientFill?: boolean; style?: ViewStyle;
  textStyle?: TextStyle; icon?: keyof typeof Ionicons.glyphMap;
  testID?: string; disabled?: boolean;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [neoStyles.btn, style, pressed && neoStyles.btnPressed]}
    >
      {gradientFill ? (
        <LinearGradient colors={gradient.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      ) : null}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        {icon ? <Ionicons name={icon} size={18} color={gradientFill ? "#0B0B14" : colors.text} /> : null}
        <Text style={[neoStyles.btnText, !gradientFill && { color: colors.text }, textStyle]}>{label}</Text>
      </View>
    </Pressable>
  );
}

export function GhostButton({
  label, onPress, style, icon, testID,
}: {
  label: string; onPress: () => void; style?: ViewStyle;
  icon?: keyof typeof Ionicons.glyphMap; testID?: string;
}) {
  return (
    <Pressable testID={testID} onPress={onPress} style={[neoStyles.ghost, style]}>
      <LinearGradient
        colors={["rgba(139,92,246,0.3)", "rgba(34,211,238,0.3)"] as any}
        style={[StyleSheet.absoluteFill, { borderRadius: radius.pill }]}
      />
      <View style={neoStyles.ghostInner}>
        {icon ? <Ionicons name={icon} size={16} color={colors.text} /> : null}
        <Text style={neoStyles.ghostText}>{label}</Text>
      </View>
    </Pressable>
  );
}

export function Chip({ label, active, onPress, testID }:
  { label: string; active?: boolean; onPress?: () => void; testID?: string }) {
  return (
    <Pressable testID={testID} onPress={onPress} style={{ marginRight: 0 }}>
      <View style={[chipStyles.chip, active && chipStyles.chipActive]}>
        {active ? (
          <LinearGradient colors={gradient.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        ) : null}
        <Text style={[chipStyles.chipText, active && chipStyles.chipTextActive]} numberOfLines={1}>{label}</Text>
      </View>
    </Pressable>
  );
}

export function GradientRing({
  percent, size = 200, stroke = 14, label, sub,
}: { percent: number; size?: number; stroke?: number; label?: string; sub?: string }) {
  // Approx circular progress via layered arcs — using conic-ish trick with rotated segments
  const cap = Math.max(0, Math.min(100, percent));
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: stroke, borderColor: "rgba(139,92,246,0.10)", position: "absolute" }} />
      <View style={{ width: size, height: size, position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        {/* Represent progress with a gradient rim overlay */}
        <LinearGradient
          colors={gradient.primary}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{
            width: size, height: size, borderRadius: size / 2,
            opacity: 0.15 + cap / 200,
          }}
        />
        <View style={{
          position: "absolute", top: stroke, left: stroke,
          width: size - stroke * 2, height: size - stroke * 2,
          borderRadius: (size - stroke * 2) / 2, backgroundColor: colors.bg,
        }} />
      </View>
      <View style={{ alignItems: "center" }}>
        {label ? <Text style={{ color: colors.text, fontSize: 48, fontWeight: "700" }}>{label}</Text> : null}
        {sub ? <Text style={{ color: colors.textDim, fontSize: 12, letterSpacing: 2, marginTop: 4, textTransform: "uppercase" }}>{sub}</Text> : null}
      </View>
    </View>
  );
}

export function StatCard({ icon, value, label, accent = colors.cyan, testID }:
  { icon: keyof typeof Ionicons.glyphMap; value: string; label: string; accent?: string; testID?: string }) {
  return (
    <GlassCard testID={testID} style={{ flex: 1, minWidth: 140 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(139,92,246,0.15)", alignItems: "center", justifyContent: "center" }}>
          <Ionicons name={icon} size={18} color={accent} />
        </View>
        <Text style={{ color: colors.textDim, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase" }}>{label}</Text>
      </View>
      <Text style={{ color: colors.text, fontSize: 28, fontWeight: "700", marginTop: 8 }}>{value}</Text>
    </GlassCard>
  );
}

export function SectionLabel({ text }: { text: string }) {
  return <Text style={{ color: colors.textDim, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: spacing.md, marginTop: spacing.md }}>{text}</Text>;
}

export function H1({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[{ color: colors.text, fontSize: font.sizeH1, fontWeight: "700" }, style]}>{children}</Text>;
}
export function H2({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[{ color: colors.text, fontSize: font.sizeH2, fontWeight: "600" }, style]}>{children}</Text>;
}
export function Body({ children, style, dim }: { children: React.ReactNode; style?: TextStyle; dim?: boolean }) {
  return <Text style={[{ color: dim ? colors.textDim : colors.text, fontSize: font.sizeBody }, style]}>{children}</Text>;
}

export function TabBar({ current, onSelect }: { current: string; onSelect: (k: string) => void }) {
  const items: Array<{ k: string; icon: keyof typeof Ionicons.glyphMap; label: string }> = [
    { k: "home", icon: "home", label: "Home" },
    { k: "workouts", icon: "barbell", label: "Train" },
    { k: "nutrition", icon: "nutrition", label: "Fuel" },
    { k: "coach", icon: "sparkles", label: "Coach" },
    { k: "profile", icon: "person-circle", label: "You" },
  ];
  return (
    <View style={tabStyles.wrap} testID="tab-bar">
      <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
      <LinearGradient colors={["rgba(19,18,38,0.9)", "rgba(11,11,20,0.95)"] as any} style={StyleSheet.absoluteFill} />
      <View style={tabStyles.row}>
        {items.map(it => {
          const active = current === it.k;
          return (
            <Pressable
              key={it.k}
              testID={`tab-${it.k}`}
              onPress={() => onSelect(it.k)}
              style={tabStyles.item}
            >
              <View style={[tabStyles.iconWrap, active && tabStyles.iconWrapActive]}>
                {active ? (
                  <LinearGradient colors={gradient.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                ) : null}
                <Ionicons name={it.icon} size={20} color={active ? "#0B0B14" : colors.textDim} />
              </View>
              <Text style={[tabStyles.label, { color: active ? colors.text : colors.textFaint }]}>{it.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const glassStyles = StyleSheet.create({
  wrap: {
    borderRadius: radius.xl,
    overflow: "hidden",
    backgroundColor: "rgba(240,240,255,0.03)",
  },
  border: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.28)",
  },
});

const neoStyles = StyleSheet.create({
  btn: {
    borderRadius: radius.xxl,
    paddingHorizontal: 24, paddingVertical: 16,
    alignItems: "center", justifyContent: "center",
    overflow: "hidden",
    shadowColor: "#8C96FF", shadowOffset: { width: -3, height: -3 }, shadowOpacity: 0.15, shadowRadius: 5, elevation: 6,
  },
  btnPressed: { opacity: 0.85 },
  btnText: { color: "#0B0B14", fontSize: 16, fontWeight: "700", letterSpacing: 0.5 },
  ghost: {
    borderRadius: radius.pill,
    padding: 1.5,
    alignItems: "center",
  },
  ghostInner: {
    borderRadius: radius.pill,
    backgroundColor: colors.bg,
    paddingVertical: 12, paddingHorizontal: 22,
    flexDirection: "row", alignItems: "center", gap: 8,
  },
  ghostText: { color: colors.text, fontSize: 14, fontWeight: "600" },
});

const chipStyles = StyleSheet.create({
  chip: {
    borderRadius: radius.pill,
    paddingHorizontal: 16, paddingVertical: 9,
    borderWidth: 1, borderColor: "rgba(139,92,246,0.35)",
    backgroundColor: "rgba(240,240,255,0.04)",
    overflow: "hidden",
    height: 36, justifyContent: "center", flexShrink: 0,
  },
  chipActive: { borderColor: "rgba(34,211,238,0.6)" },
  chipText: { color: colors.textDim, fontSize: 12, letterSpacing: 1, textTransform: "uppercase", fontWeight: "600" },
  chipTextActive: { color: "#0B0B14" },
});

const tabStyles = StyleSheet.create({
  wrap: {
    position: "absolute", left: spacing.lg, right: spacing.lg, bottom: spacing.lg,
    borderRadius: radius.xxl, overflow: "hidden",
    borderWidth: 1, borderColor: "rgba(139,92,246,0.28)",
  },
  row: { flexDirection: "row", paddingVertical: 10, paddingHorizontal: 8 },
  item: { flex: 1, alignItems: "center", gap: 3, paddingVertical: 4 },
  iconWrap: {
    width: 40, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center",
    overflow: "hidden",
  },
  iconWrapActive: {},
  label: { fontSize: 10, letterSpacing: 0.5, fontWeight: "600" },
});
