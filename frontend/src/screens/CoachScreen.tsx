import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, KeyboardAvoidingView, Platform, Animated } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { GlassCard, NeoButton, GhostButton, H1, H2, Body } from "@/src/ui";
import { colors, gradient, radius, spacing } from "@/src/theme";
import { api } from "@/src/api";

const SESSION_ID = "coach_default";

const SUGGESTIONS = [
  "How do I fix knee valgus?",
  "Adjust my program for a plateau",
  "What's my weakest sub-score?",
  "Recovery routine for sore legs",
];

export default function CoachScreen() {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 1600, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 1600, useNativeDriver: true }),
    ])).start();
    api.chatHistory(SESSION_ID).then(setMessages).catch(() => {});
  }, []);

  const send = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput("");
    const optimistic = [...messages, { role: "user", content: msg }];
    setMessages(optimistic);
    setLoading(true);
    try {
      const r = await api.chat(SESSION_ID, msg);
      setMessages([...optimistic, { role: "assistant", content: r.reply }]);
    } catch (e: any) {
      setMessages([...optimistic, { role: "assistant", content: "Coach offline. Try again in a moment." }]);
    }
    setLoading(false);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }} keyboardVerticalOffset={20}>
        <View style={styles.header}>
          <View>
            <Text style={{ color: colors.textDim, fontSize: 11, letterSpacing: 3 }}>NEURAL LINK</Text>
            <H1>AI Coach</H1>
          </View>
          <Animated.View style={[styles.orb, { transform: [{ scale }], opacity }]}>
            <LinearGradient colors={gradient.magenta} start={{x:0,y:0}} end={{x:1,y:1}} style={StyleSheet.absoluteFill} />
            <Ionicons name="sparkles" size={20} color="#0B0B14" />
          </Animated.View>
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.length === 0 && (
            <GlassCard>
              <View style={{ alignItems: "center", padding: spacing.md }}>
                <Ionicons name="sparkles" size={32} color={colors.magenta} />
                <H2 style={{ marginTop: 12 }}>Ask me anything</H2>
                <Body dim style={{ textAlign: "center", marginTop: 4 }}>Form, programming, nutrition, or plateaus — I'm your training partner.</Body>
              </View>
            </GlassCard>
          )}
          {messages.map((m, i) => (
            <View key={i} style={[styles.msg, m.role === "user" ? styles.msgUser : styles.msgBot]}>
              {m.role === "assistant" && (
                <View style={styles.avatar}>
                  <LinearGradient colors={gradient.magenta} style={StyleSheet.absoluteFill} />
                  <Ionicons name="sparkles" size={12} color="#0B0B14" />
                </View>
              )}
              <View style={m.role === "user" ? styles.bubbleUser : styles.bubbleBot}>
                {m.role === "user" && (
                  <LinearGradient colors={gradient.primary} start={{x:0,y:0}} end={{x:1,y:1}} style={StyleSheet.absoluteFill} />
                )}
                <Text style={{ color: m.role === "user" ? "#0B0B14" : colors.text, lineHeight: 20 }}>{m.content}</Text>
              </View>
            </View>
          ))}
          {loading && (
            <View style={styles.typing}>
              <View style={styles.avatar}>
                <LinearGradient colors={gradient.magenta} style={StyleSheet.absoluteFill} />
                <Ionicons name="sparkles" size={12} color="#0B0B14" />
              </View>
              <View style={styles.bubbleBot}>
                <Text style={{ color: colors.textDim, fontStyle: "italic" }}>Coach is thinking…</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {messages.length === 0 && (
          <View style={{ paddingHorizontal: spacing.lg, marginBottom: 8 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {SUGGESTIONS.map((s, i) => (
                <Pressable key={i} onPress={() => send(s)} style={styles.suggestion} testID={`sug-${i}`}>
                  <Text style={{ color: colors.text, fontSize: 12 }}>{s}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.inputBar}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask your coach…"
            placeholderTextColor={colors.textFaint}
            style={styles.input}
            onSubmitEditing={() => send()}
            testID="coach-input"
          />
          <Pressable onPress={() => send()} style={styles.sendBtn} testID="coach-send">
            <LinearGradient colors={gradient.primary} start={{x:0,y:0}} end={{x:1,y:1}} style={StyleSheet.absoluteFill} />
            <Ionicons name="arrow-up" size={20} color="#0B0B14" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: spacing.lg },
  orb: {
    width: 44, height: 44, borderRadius: 22, overflow: "hidden",
    alignItems: "center", justifyContent: "center",
    shadowColor: colors.magenta, shadowOpacity: 0.8, shadowRadius: 15, elevation: 10,
  },
  msg: { flexDirection: "row", marginBottom: spacing.md, gap: 8 },
  msgUser: { justifyContent: "flex-end" },
  msgBot: { justifyContent: "flex-start" },
  avatar: {
    width: 26, height: 26, borderRadius: 13, overflow: "hidden",
    alignItems: "center", justifyContent: "center", marginTop: 2,
  },
  bubbleUser: {
    maxWidth: "78%", padding: 12, borderRadius: 18, borderBottomRightRadius: 4,
    overflow: "hidden",
  },
  bubbleBot: {
    maxWidth: "78%", padding: 12, borderRadius: 18, borderBottomLeftRadius: 4,
    backgroundColor: "rgba(240,240,255,0.06)",
    borderWidth: 1, borderColor: "rgba(139,92,246,0.25)",
  },
  typing: { flexDirection: "row", gap: 8, marginBottom: spacing.md },
  suggestion: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.pill,
    backgroundColor: "rgba(240,240,255,0.05)",
    borderWidth: 1, borderColor: "rgba(139,92,246,0.28)",
  },
  inputBar: {
    flexDirection: "row", alignItems: "center", gap: 8,
    padding: spacing.md, marginHorizontal: spacing.lg, marginBottom: 100,
    borderRadius: radius.pill,
    backgroundColor: "rgba(19,18,38,0.9)",
    borderWidth: 1, borderColor: "rgba(139,92,246,0.3)",
  },
  input: { flex: 1, color: colors.text, fontSize: 15, paddingHorizontal: 8 },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20, overflow: "hidden",
    alignItems: "center", justifyContent: "center",
  },
});
