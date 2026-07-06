import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Pressable } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { CosmicBackground, GlassCard, NeoButton, H1, Body } from "@/src/ui";
import { colors, gradient, radius, spacing } from "@/src/theme";
import { useAuth } from "@/src/auth";

export default function AuthScreen() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const { login, signup, googleLogin } = useAuth();

  const submit = async () => {
    setErr(""); setLoading(true);
    try {
      if (mode === "signup" && password !== confirmPw) throw new Error("Passwords don't match");
      if (mode === "login") await login(email.trim(), password);
      else await signup(name.trim(), email.trim(), password);
    } catch (e: any) { setErr(e.message || "Failed"); }
    setLoading(false);
  };

  const googleSignIn = async () => {
    setErr(""); setLoading(true);
    try {
      if (Platform.OS === "web") {
        const w: any = window;
        const redirect = w.location.origin + "/";
        w.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirect)}`;
        return;
      }
      const redirect = Linking.createURL("auth");
      const url = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirect)}`;
      const result = await WebBrowser.openAuthSessionAsync(url, redirect);
      if (result.type === "success" && result.url) {
        const parsed = new URL(result.url.replace("#", "?"));
        const sid = parsed.searchParams.get("session_id");
        if (sid) await googleLogin(sid);
        else setErr("No session returned");
      } else if (result.type !== "cancel") {
        setErr("Google sign-in failed");
      }
    } catch (e: any) { setErr(e.message || "Google sign-in failed"); }
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
              <Field label="Password" icon="lock-closed" value={password} onChange={setPassword} secure={!showPw}
                     rightIcon={showPw ? "eye-off" : "eye"} onRightPress={() => setShowPw(v => !v)}
                     testID="auth-password" />
              {mode === "signup" && (
                <Field label="Confirm Password" icon="lock-closed" value={confirmPw} onChange={setConfirmPw}
                       secure={!showPw} testID="auth-confirm" />
              )}

              {err ? <Text style={styles.err} testID="auth-error">{err}</Text> : null}

              <NeoButton
                label={loading ? "..." : (mode === "login" ? "Sign In" : "Create Account")}
                onPress={submit}
                testID="auth-submit"
                icon="arrow-forward"
                style={{ marginTop: spacing.md }}
                disabled={loading}
              />

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              <Pressable onPress={googleSignIn} style={styles.googleBtn} testID="auth-google" disabled={loading}>
                <View style={styles.googleG}>
                  <Text style={{ fontWeight: "900", fontSize: 16, color: "#fff" }}>G</Text>
                </View>
                <Text style={styles.googleTxt}>Continue with Google</Text>
              </Pressable>

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

function Field({ label, icon, value, onChange, secure, keyboardType, autoCap, testID, rightIcon, onRightPress }: any) {
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
        {rightIcon && (
          <Pressable onPress={onRightPress} hitSlop={10}>
            <Ionicons name={rightIcon} size={18} color={colors.textDim} />
          </Pressable>
        )}
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
  divider: { flexDirection: "row", alignItems: "center", marginVertical: spacing.lg, gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "rgba(139,92,246,0.25)" },
  dividerText: { color: colors.textDim, fontSize: 11, letterSpacing: 2 },
  googleBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    paddingVertical: 14, borderRadius: radius.xxl,
    backgroundColor: "rgba(240,240,255,0.06)",
    borderWidth: 1, borderColor: "rgba(139,92,246,0.35)",
  },
  googleG: {
    width: 22, height: 22, borderRadius: 4, alignItems: "center", justifyContent: "center",
    backgroundColor: "#4285F4",
  },
  googleTxt: { color: colors.text, fontWeight: "700", fontSize: 15 },
});
