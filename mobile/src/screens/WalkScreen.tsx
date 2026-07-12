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
      {/* 残高 */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>ためたチリツモ</Text>
        <Text style={styles.balanceValue}>
          {balance} <Text style={styles.balanceUnit}>pt</Text>
        </Text>
        <Text style={styles.balanceNote}>塵も積もれば山となる。歩いてためよう。</Text>
      </View>

      {/* 今日の歩数 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>今日の歩数</Text>
        {status === "unavailable" && (
          <Text style={styles.warnText}>この端末では歩数計を利用できません</Text>
        )}
        {status === "denied" && (
          <Text style={styles.warnText}>
            歩数の計測が許可されていません。設定アプリから許可してください。
          </Text>
        )}
        <Text style={styles.stepsValue}>
          {steps.toLocaleString()} <Text style={styles.stepsUnit}>歩</Text>
        </Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={styles.progressLabel}>
          {steps >= DAILY_STEP_CAP
            ? "今日の上限(1万歩)に到達!"
            : `あと ${stepsToNextChunk(steps).toLocaleString()} 歩で +${POINTS_PER_CHUNK}pt`}
        </Text>

        <Pressable
          onPress={claim}
          disabled={claimable <= 0}
          style={[styles.claimBtn, claimable <= 0 && styles.claimBtnDisabled]}
        >
          <Text style={styles.claimBtnText}>
            {claimable > 0 ? `+${claimablePoints}pt を受け取る` : "1000歩ごとに受け取れます"}
          </Text>
        </Pressable>
      </View>

      {/* ログインボーナス */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>本日のボーナス</Text>
        <Pressable
          onPress={claimBonus}
          disabled={bonusDone}
          style={[styles.bonusBtn, bonusDone && styles.claimBtnDisabled]}
        >
          <Text style={styles.claimBtnText}>
            {bonusDone ? "✅ 受取済み(また明日!)" : `🎁 ログインボーナス +${LOGIN_BONUS}pt`}
          </Text>
        </Pressable>
      </View>

      {justClaimed != null && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>+{justClaimed}pt ゲット!</Text>
        </View>
      )}

      <Text style={styles.footNote}>
        ルール:{STEPS_PER_CHUNK.toLocaleString()}歩ごとに{POINTS_PER_CHUNK}
        pt。1日{DAILY_STEP_CAP.toLocaleString()}歩まで換算。ポイントの使い道は今後追加予定。
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 14 },
  balanceCard: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 20,
  },
  balanceLabel: { color: "#ffe3d6", fontSize: 12, fontWeight: "700" },
  balanceValue: { color: "#fff", fontSize: 40, fontWeight: "800", marginTop: 4 },
  balanceUnit: { fontSize: 18, fontWeight: "700" },
  balanceNote: { color: "#ffe3d6", fontSize: 11, marginTop: 4 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { fontSize: 13, color: colors.textSub, fontWeight: "700", marginBottom: 8 },
  warnText: { fontSize: 12, color: colors.primaryDark, marginBottom: 6 },
  stepsValue: { fontSize: 34, fontWeight: "800", color: colors.text },
  stepsUnit: { fontSize: 16, fontWeight: "600", color: colors.textSub },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.bg,
    marginTop: 12,
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: colors.point, borderRadius: 999 },
  progressLabel: { fontSize: 12, color: colors.textSub, marginTop: 6 },
  claimBtn: {
    marginTop: 14,
    backgroundColor: colors.point,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  bonusBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  claimBtnDisabled: { backgroundColor: colors.border },
  claimBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  toast: {
    backgroundColor: colors.text,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  toastText: { color: "#fff", fontWeight: "700" },
  footNote: { fontSize: 11, color: colors.textSub, textAlign: "center", marginTop: 4 },
});
