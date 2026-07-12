import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { PointsProvider, usePoints } from "./src/context/PointsContext";
import MapScreen from "./src/screens/MapScreen";
import WalkScreen from "./src/screens/WalkScreen";
import { colors } from "./src/theme";

type Tab = "map" | "walk";

export default function App() {
  return (
    <PointsProvider>
      <Root />
    </PointsProvider>
  );
}

function Root() {
  const [tab, setTab] = useState<Tab>("map");
  const { balance } = usePoints();

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.title}>🍜 ビンボーマップ</Text>
        <View style={styles.pointBadge}>
          <Text style={styles.pointBadgeText}>💰 {balance}pt</Text>
        </View>
      </View>

      <View style={styles.body}>{tab === "map" ? <MapScreen /> : <WalkScreen />}</View>

      <View style={styles.tabBar}>
        <TabButton label="🗺️ マップ" active={tab === "map"} onPress={() => setTab("map")} />
        <TabButton
          label="👟 歩いてためる"
          active={tab === "walk"}
          onPress={() => setTab("walk")}
        />
      </View>
    </SafeAreaView>
  );
}

function TabButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.tabBtn}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  title: { fontSize: 17, fontWeight: "800", color: colors.text },
  pointBadge: {
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  pointBadgeText: { color: colors.primaryDark, fontWeight: "700", fontSize: 13 },
  body: { flex: 1 },
  tabBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  tabBtn: { flex: 1, alignItems: "center", paddingVertical: 12 },
  tabText: { fontSize: 14, color: colors.textSub },
  tabTextActive: { color: colors.primary, fontWeight: "800" },
});
