import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { usePoints } from "../context/PointsContext";
import { useTodaySteps } from "../hooks/useSteps";
import {
  DAILY_STEP_CAP,
  LOGIN_BONUS,
  POINTS_PER_CHUNK,
  STEPS_PER_CHUNK,
  chunksToPoints,
  claimableChunks,
  dateKey,
  stepsToNextChunk,
} from "../lib/points";
import { getJSON, setJSON, KEYS } from "../lib/storage";
import { colors } from "../theme";

const MAX_DAILY_POINTS = chunksToPoints(DAILY_STEP_CAP / STEPS_PER_CHUNK);

export default function WalkScreen() {
  const { balance, addPoints } = usePoints();
  const { steps, status } = useTodaySteps();
  const [claimed, setClaimed] = useState(0);
  const [bonusDone, setBonusDone] = useState(true);
  const [justClaimed, setJustClaimed] = useState<number | null>(null);

  const today = dateKey();

  useEffect(() => {
    getJSON<number>(KEYS.claimedChunks(today), 0).then(setClaimed);
    getJSON<boolean>(KEYS.loginBonus(today), false).then(setBonusDone);
  }, [today]);

  const claimable = claimableChunks(steps, claimed);
  const claimablePoints = chunksToPoints(claimable);
  const progress = Math.min(steps / DAILY_STEP_CAP, 1);

  async function claim() {
    if (claimable <= 0) return;
    const nextClaimed = claimed + claimable;
    setClaimed(nextClaimed);
    await setJSON(KEYS.claimedChunks(today), nextClaimed);
    await addPoints(claimablePoints);
    setJustClaimed(claimablePoints);
  }

  async function claimBonus() {
    if (bonusDone) return;
    setBonusDone(true);
    await setJSON(KEYS.loginBonus(today), true);
    await addPoints(LOGIN_BONUS);
    setJustClaimed(LOGIN_BONUS);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 今日の歩数(참고앱풍の大カード) */}
      <View style={styles.card}>
        <View style={styles.stepsHeader}>
          <Text style={styles.stepsEmoji}>👟</Text>
          <View style={styles.stepsCenter}>
            <Text style={styles.stepsLabel}>今日の歩数</Text>
            <Text style={styles.stepsValue}>{steps.toLocaleString()}</Text>
          </View>
          <View style={styles.liveBadge}>
            <Text style={styles.liveBadgeText}>リアルタイム</Text>
          </View>
        </View>

        {status === "unavailable" && (
          <Text style={styles.warnText}>この端末では歩数計を利用できません</Text>
        )}
        {status === "denied" && (
          <Text style={styles.warnText}>
            歩数の計測が許可されていません。設定アプリから許可してください。
          </Text>
        )}

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        <View style={styles.progressMeta}>
          <Text style={styles.progressLabel}>
            {steps.toLocaleString()} / {DAILY_STEP_CAP.toLocaleString()}歩
          </Text>
          <Text style={styles.progressMax}>
            最大 <Text style={styles.progressMaxStrong}>{MAX_DAILY_POINTS}</Text> pt
          </Text>
        </View>

        <Pressable
          onPress={claim}
          disabled={claimable <= 0}
          style={[styles.btnDark, claimable <= 0 && styles.btnDisabled]}
        >
          <Text style={styles.btnDarkText}>
            {claimable > 0
              ? `✨ +${claimablePoints}pt を受け取る`
              : steps >= DAILY_STEP_CAP
                ? "今日の上限に到達!また明日"
                : `あと${stepsToNextChunk(steps).toLocaleString()}歩で +${POINTS_PER_CHUNK}pt`}
          </Text>
        </Pressable>
      </View>

      {/* ためたポイント */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <View style={styles.rowLeft}>
            <Text style={styles.rowEmoji}>💰</Text>
            <View>
              <Text style={styles.rowTitle}>ためたチリツモ</Text>
              <Text style={styles.rowSub}>塵も積もれば山となる</Text>
            </View>
          </View>
          <Text style={styles.balanceValue}>
            {balance}
            <Text style={styles.balanceUnit}> pt</Text>
          </Text>
        </View>
      </View>

      {/* ログインボーナス(참고앱の「ブースト」枠相当) */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <View style={styles.rowLeft}>
            <Text style={styles.rowEmoji}>⚡️</Text>
            <View>
              <Text style={styles.rowTitle}>本日のボーナス</Text>
              <Text style={styles.rowSub}>1日1回タップでもらえる</Text>
            </View>
          </View>
          <Pressable
            onPress={claimBonus}
            disabled={bonusDone}
            style={[styles.btnDarkSmall, bonusDone && styles.btnDisabled]}
          >
            <Text style={styles.btnDarkText}>
              {bonusDone ? "受取済み" : `+${LOGIN_BONUS}pt`}
            </Text>
          </Pressable>
        </View>
      </View>

      {justClaimed != null && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>✨ +{justClaimed}pt ゲット!</Text>
        </View>
      )}

      <Text style={styles.footNote}>
        ルール:{STEPS_PER_CHUNK.toLocaleString()}歩ごとに{POINTS_PER_CHUNK}pt、1日
        {DAILY_STEP_CAP.toLocaleString()}歩まで換算。ポイントの使い道は今後追加予定。
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 14, paddingTop: 62, gap: 12 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  stepsHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepsEmoji: { fontSize: 34 },
  stepsCenter: { flex: 1 },
  stepsLabel: { fontSize: 13, color: colors.textSub, fontWeight: "600" },
  stepsValue: { fontSize: 40, fontWeight: "800", color: colors.text, lineHeight: 46 },
  liveBadge: {
    backgroundColor: colors.bg,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  liveBadgeText: { fontSize: 11, color: colors.text, fontWeight: "600" },
  warnText: { fontSize: 12, color: colors.primaryDark, marginTop: 8 },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.bg,
    marginTop: 14,
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: colors.dark, borderRadius: 999 },
  progressMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  progressLabel: { fontSize: 13, color: colors.textSub },
  progressMax: { fontSize: 13, color: colors.textSub },
  progressMaxStrong: { fontWeight: "800", color: colors.text, fontSize: 15 },
  btnDark: {
    marginTop: 14,
    backgroundColor: colors.dark,
    borderRadius: 999,
    paddingVertical: 13,
    alignItems: "center",
  },
  btnDarkSmall: {
    backgroundColor: colors.dark,
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 16,
  },
  btnDisabled: { backgroundColor: colors.border },
  btnDarkText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  rowEmoji: { fontSize: 24 },
  rowTitle: { fontSize: 14, fontWeight: "700", color: colors.text },
  rowSub: { fontSize: 11, color: colors.textSub },
  balanceValue: { fontSize: 26, fontWeight: "800", color: colors.text },
  balanceUnit: { fontSize: 14, fontWeight: "700", color: colors.textSub },
  toast: {
    backgroundColor: colors.dark,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: "center",
  },
  toastText: { color: "#fff", fontWeight: "700" },
  footNote: { fontSize: 11, color: colors.textSub, textAlign: "center", marginTop: 4 },
});
