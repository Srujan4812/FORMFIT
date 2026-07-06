import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Pressable, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { CosmicBackground, GlassCard, NeoButton, GhostButton, H1, Body } from "@/src/ui";
import { colors, gradient, radius, spacing } from "@/src/theme";
import { useAuth } from "@/src/auth";

export default function AuthScreen() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const { login, signup } = useAuth();

  const submit = async () => {
    setErr(""); setLoading(true);
    try {
      if (mode === "login") await login(email.trim(), password);
      else await signup(name.trim(), email.trim(), password);
    } catch (e: any) { setErr(e.message || "Failed"); }
    setLoading(false);
  };

  return (
    <CosmicBackground>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingTop: 40 }} keyboardShouldPersistTaps="handled">
            <View style={{ alignItems: "center", marginBottom: 32 }}>
              <View style={styles.logoOrb}>
                <LinearGradient colors={gradient.primary} start={{x:0,y:0}} end={{x:1,y:1}} style={StyleSheet.absoluteFill} />
                <Ionicons name="fitness" size={38} color="#0B0B14" />
              </View>
              <Text style={styles.brand}>FormFit</Text>
              <Text style={styles.tag}>COSMIC · NEBULA · EDITION</Text>
            </View>

            <GlassCard>
              <H1 style={{ marginBottom: 4 }}>{mode === "login" ? "Welcome back" : "Enter the void"}</H1>
              <Body dim style={{ marginBottom: spacing.xl }}>
                {mode === "login" ? "Sign in to continue your journey" : "Create your commander profile"}
              </Body>

              {mode === "signup" && (
                <Field label="Name" icon="person" value={name} onChange={setName} testID="signup-name" />
              )}
              <Field label="Email" icon="mail" value={email} onChange={setEmail} keyboardType="email-address" autoCap="none" testID="auth-email" />
              <Field label="Password" icon="lock-closed" value={password} onChange={setPassword} secure testID="auth-password" />

              {err ? <Text style={styles.err} testID="auth-error">{err}</Text> : null}

              <NeoButton
                label={loading ? "..." : (mode === "login" ? "Sign In" : "Create Account")}
                onPress={submit}
                testID="auth-submit"
                icon="arrow-forward"
                style={{ marginTop: spacing.md }}
              />

              <Pressable onPress={() => setMode(mode === "login" ? "signup" : "login")} style={{ marginTop: spacing.lg, alignItems: "center" }} testID="auth-toggle">
                <Text style={{ color: colors.textDim }}>
                  {mode === "login" ? "Need an account? " : "Already have one? "}
                  <Text style={{ color: colors.cyan, fontWeight: "700" }}>{mode === "login" ? "Sign up" : "Sign in"}</Text>
                </Text>
              </Pressable>
            </GlassCard>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </CosmicBackground>
  );
}

function Field({ label, icon, value, onChange, secure, keyboardType, autoCap, testID }: any) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={styles.fieldLabel}>{label.toUpperCase()}</Text>
      <View style={styles.fieldWrap}>
        <Ionicons name={icon} size={16} color={colors.textDim} />
        <TextInput
          testID={testID}
          value={value}
          onChangeText={onChange}
          secureTextEntry={secure}
          keyboardType={keyboardType}
          autoCapitalize={autoCap || "sentences"}
          placeholder={label}
          placeholderTextColor={colors.textFaint}
          style={styles.input}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  logoOrb: {
    width: 76, height: 76, borderRadius: 38, overflow: "hidden",
    alignItems: "center", justifyContent: "center", marginBottom: 12,
    shadowColor: colors.violet, shadowOpacity: 0.5, shadowRadius: 20, shadowOffset: { width: 0, height: 0 }, elevation: 12,
  },
  brand: { color: colors.text, fontSize: 32, fontWeight: "700", letterSpacing: 1 },
  tag: { color: colors.textDim, fontSize: 10, letterSpacing: 3, marginTop: 4 },
  fieldLabel: { color: colors.textDim, fontSize: 10, letterSpacing: 2, marginBottom: 6 },
  fieldWrap: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "rgba(11,11,20,0.6)",
    borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: "rgba(139,92,246,0.2)",
  },
  input: { flex: 1, color: colors.text, fontSize: 15, paddingVertical: 4 },
  err: { color: colors.red, marginTop: 8, textAlign: "center" },
});
