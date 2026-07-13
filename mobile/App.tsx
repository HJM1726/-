import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { PointsProvider, usePoints } from "./src/context/PointsContext";
import GiftScreen from "./src/screens/GiftScreen";
import GuideScreen from "./src/screens/GuideScreen";
import MapScreen from "./src/screens/MapScreen";
import WalkScreen from "./src/screens/WalkScreen";
import { colors } from "./src/theme";

type Tab = "map" | "walk" | "guide" | "gift";

const TABS: { id: Tab; label: string }[] = [
  { id: "map", label: "📍マップ" },
  { id: "walk", label: "👟歩数" },
  { id: "guide", label: "📚ガイド" },
  { id: "gift", label: "🎁ギフト" },
];

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
      <View style={styles.body}>
        {tab === "map" && <MapScreen />}
        {tab === "walk" && <WalkScreen onGoGuide={() => setTab("guide")} />}
        {tab === "guide" && <GuideScreen />}
        {tab === "gift" && <GiftScreen />}

        {/* 참고앱풍のフローティング上部バー(マップの上に浮かせる) */}
        <View style={styles.topBar} pointerEvents="box-none">
          <View style={styles.segment}>
            {TABS.map((t) => (
              <SegmentButton
                key={t.id}
                label={t.label}
                active={tab === t.id}
                onPress={() => setTab(t.id)}
              />
            ))}
          </View>
          <View style={styles.pointBadge}>
            <Text style={styles.pointBadgeText}>✨ {balance}</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

function SegmentButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.segmentBtn, active && styles.segmentBtnActive]}>
      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1 },
  topBar: {
    position: "absolute",
    top: 8,
    left: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 2000,
  },
  segment: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: 999,
    padding: 4,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  segmentBtn: { borderRadius: 999, paddingVertical: 8, paddingHorizontal: 8 },
  segmentBtnActive: { backgroundColor: colors.dark },
  segmentText: { fontSize: 12, color: colors.textSub, fontWeight: "600" },
  segmentTextActive: { color: "#fff", fontWeight: "800" },
  pointBadge: {
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  pointBadgeText: { fontSize: 13, fontWeight: "800", color: colors.text },
});
