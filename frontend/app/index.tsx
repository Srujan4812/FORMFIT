import React, { useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { useAuth } from "@/src/auth";
import { CosmicBackground, TabBar } from "@/src/ui";
import { colors } from "@/src/theme";
import AuthScreen from "@/src/screens/AuthScreen";
import HomeScreen from "@/src/screens/HomeScreen";
import WorkoutsScreen from "@/src/screens/WorkoutsScreen";
import NutritionScreen from "@/src/screens/NutritionScreen";
import CoachScreen from "@/src/screens/CoachScreen";
import ProfileScreen from "@/src/screens/ProfileScreen";

export default function Index() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState("home");

  if (loading) {
    return (
      <CosmicBackground>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.cyan} size="large" />
        </View>
      </CosmicBackground>
    );
  }

  if (!user) return <AuthScreen />;

  return (
    <CosmicBackground>
      <View style={{ flex: 1 }}>
        {tab === "home" && <HomeScreen onNavigate={setTab} />}
        {tab === "workouts" && <WorkoutsScreen onNavigate={setTab} />}
        {tab === "nutrition" && <NutritionScreen />}
        {tab === "coach" && <CoachScreen />}
        {tab === "profile" && <ProfileScreen onNavigate={setTab} />}
        <TabBar current={tab} onSelect={setTab} />
      </View>
    </CosmicBackground>
  );
}
