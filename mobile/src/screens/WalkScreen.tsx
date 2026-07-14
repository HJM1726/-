import React, { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import LoginModal from "../components/LoginModal";
import { useAccount } from "../context/AccountContext";
import { usePoints } from "../context/PointsContext";
import { useTodaySteps } from "../hooks/useSteps";
import {
  AD_DAILY_CAP,
  AD_REWARD,
  CHEST_MAX,
  CHEST_MIN,
  FINAL_MILESTONE_STEPS,
  LOGIN_BONUS,
  MAX_DAILY_STEP_POINTS,
  QUIZ_REWARD,
  ROULETTE_PRIZES,
  STEP_MILESTONES,
  claimableMilestones,
  dateKey,
  nextMilestone,
  rollChest,
  rollRoulette,
} from "../lib/points";
import { getJSON, setJSON, KEYS } from "../lib/storage";
import { colors } from "../theme";

const ROULETTE_MAX = Math.max(...ROULETTE_PRIZES);

export default function WalkScreen({ onGoGuide }: { onGoGuide?: () => void }) {
  const { balance, addPoints } = usePoints();
  const { account } = useAccount();
  const { steps, status } = useTodaySteps();
  const [claimed, setClaimed] = useState<number[]>([]);
  const [bonusDone, setBonusDone] = useState(true);
  const [rouletteResult, setRouletteResult] = useState<number | null>(null);
  const [chestResult, setChestResult] = useState<number | null>(null);
  const [adViews, setAdViews] = useState(0);
  const [adPlaying, setAdPlaying] = useState(false);
  const [loginVisible, setLoginVisible] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const today = dateKey();

  useEffect(() => {
    getJSON<number[]>(KEYS.claimedMilestones(today), []).then(setClaimed);
    getJSON<boolean>(KEYS.loginBonus(today), false).then(setBonusDone);
    getJSON<number | null>(KEYS.roulette(today), null).then(setRouletteResult);
    getJSON<number | null>(KEYS.chest(today), null).then(setChestResult);
    getJSON<number>(KEYS.adViews(today), 0).then(setAdViews);
  }, [today]);

  const claimable = claimableMilestones(steps, claimed);
  const next = nextMilestone(steps);
  const progress = Math.min(steps / FINAL_MILESTONE_STEPS, 1);
  const adLeft = AD_DAILY_CAP - adViews;

  /* 참고앱 방식의 게이트: 閲覧은 익명 OK, 포인트 수령은 로그인 필수(부정 방지) */
  function requireLogin(): boolean {
    if (account) return false;
    setLoginVisible(true);
    return true;
  }

  async function claimMilestone(msSteps: number, pt: number) {
    if (requireLogin()) return;
    if (claimed.includes(msSteps)) return;
    const nextClaimed = [...claimed, msSteps];
    setClaimed(nextClaimed);
    await setJSON(KEYS.claimedMilestones(today), nextClaimed);
    await addPoints(pt);
    setToast(`✨ +${pt}pt ゲット!`);
  }

  async function claimBonus() {
    if (requireLogin()) return;
    if (bonusDone) return;
    setBonusDone(true);
    await setJSON(KEYS.loginBonus(today), true);
    await addPoints(LOGIN_BONUS);
    setToast(`✨ 出席 +${LOGIN_BONUS}pt!`);
  }

  async function spinRoulette() {
    if (requireLogin()) return;
    if (rouletteResult != null) return;
    const prize = rollRoulette();
    setRouletteResult(prize);
    await setJSON(KEYS.roulette(today), prize);
    await addPoints(prize);
    setToast(`🎰 ルーレット +${prize}pt!`);
  }

  async function openChest() {
    if (requireLogin()) return;
    if (chestResult != null) return;
    const prize = rollChest();
    setChestResult(prize);
    await setJSON(KEYS.chest(today), prize);
    await addPoints(prize);
    setToast(`🎁 宝箱 +${prize}pt!`);
  }

  function startAd() {
    if (requireLogin()) return;
    if (adLeft <= 0 || adPlaying) return;
    setAdPlaying(true);
  }

  async function finishAd() {
    setAdPlaying(false);
    const nextViews = adViews + 1;
    setAdViews(nextViews);
    await setJSON(KEYS.adViews(today), nextViews);
    await addPoints(AD_REWARD);
    setToast(`📺 広告視聴 +${AD_REWARD}pt!`);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 今日の歩数 */}
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
            {steps.toLocaleString()} / {FINAL_MILESTONE_STEPS.toLocaleString()}歩
          </Text>
          <Text style={styles.progressLabel}>
            1日最大 <Text style={styles.progressStrong}>{MAX_DAILY_STEP_POINTS}</Text> pt
          </Text>
        </View>
      </View>

      {/* 区間報酬(참고앱の구간보상) */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>区間報酬</Text>
        {STEP_MILESTONES.map((m) => {
          const reached = steps >= m.steps;
          const done = claimed.includes(m.steps);
          const isClaimable = claimable.some((c) => c.steps === m.steps);
          return (
            <View key={m.steps} style={styles.milestoneRow}>
              <Text style={styles.milestoneSteps}>{m.steps.toLocaleString()}歩</Text>
              <Text style={styles.milestonePt}>+{m.pt}pt</Text>
              <Pressable
                onPress={() => void claimMilestone(m.steps, m.pt)}
                disabled={!isClaimable}
                style={[
                  styles.milestoneBtn,
                  done && styles.milestoneBtnDone,
                  !reached && styles.milestoneBtnLocked,
                ]}
              >
                <Text style={[styles.milestoneBtnText, (!reached || done) && styles.milestoneBtnTextDim]}>
                  {done ? "受取済" : reached ? "受け取る" : `あと${(m.steps - steps).toLocaleString()}歩`}
                </Text>
              </Pressable>
            </View>
          );
        })}
        {next == null && <Text style={styles.allDone}>🎉 今日の全区間を達成!</Text>}
      </View>

      {!account && (
        <Pressable onPress={() => setLoginVisible(true)} style={styles.loginBanner}>
          <Text style={styles.loginBannerText}>
            🔒 ポイントの受け取りにはログイン(ニックネーム登録)が必要です。タップして登録
          </Text>
        </Pressable>
      )}

      {/* デイリーリワードタイル(참고앱の리워드 허브) */}
      <View style={styles.tileGrid}>
        <RewardTile
          emoji="🗓"
          title="出席"
          value={bonusDone ? "受取済み" : `+${LOGIN_BONUS}pt`}
          done={bonusDone}
          onPress={() => void claimBonus()}
        />
        <RewardTile
          emoji="📺"
          title="広告を見る"
          value={adLeft > 0 ? `+${AD_REWARD}pt・残り${adLeft}回` : "本日の上限"}
          done={adLeft <= 0}
          onPress={startAd}
        />
        <RewardTile
          emoji="🎰"
          title="ルーレット"
          value={rouletteResult != null ? `+${rouletteResult}pt` : `最大${ROULETTE_MAX}pt`}
          done={rouletteResult != null}
          onPress={() => void spinRoulette()}
        />
        <RewardTile
          emoji="🎁"
          title="宝箱"
          value={chestResult != null ? `+${chestResult}pt` : `+${CHEST_MIN}〜${CHEST_MAX}pt`}
          done={chestResult != null}
          onPress={() => void openChest()}
        />
        <RewardTile
          emoji="🧠"
          title="クイズ"
          value={`正解で+${QUIZ_REWARD}pt`}
          done={false}
          onPress={() => onGoGuide?.()}
        />
      </View>

      {/* 残高 */}
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

      {toast != null && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

      <Text style={styles.footNote}>
        毎日リセット:区間報酬(最大{MAX_DAILY_STEP_POINTS}pt)+出席+広告(最大{AD_REWARD * AD_DAILY_CAP}pt)+ルーレット+宝箱。ポイントは交換所のクーポンと抽選で使えます。
      </Text>

      <AdModal visible={adPlaying} onFinish={() => void finishAd()} />
      <LoginModal visible={loginVisible} onClose={() => setLoginVisible(false)} />
    </ScrollView>
  );
}

/* リワード広告のプレースホルダー。本番はAdMob等のリワード広告SDKに差し替え、
 * 「視聴完了コールバック→サーバーで付与」の流れにする(참고앱の재원 연동 방식)。 */
function AdModal({ visible, onFinish }: { visible: boolean; onFinish: () => void }) {
  const [remaining, setRemaining] = useState(3);

  useEffect(() => {
    if (!visible) return;
    setRemaining(3);
    const timer = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(timer);
          onFinish();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.adOverlay}>
        <View style={styles.adBox}>
          <Text style={styles.adLabel}>広告(デモ)</Text>
          <Text style={styles.adEmoji}>📺</Text>
          <Text style={styles.adText}>広告SDK連携前のプレースホルダーです</Text>
          <Text style={styles.adCount}>{remaining}秒後に +{AD_REWARD}pt</Text>
        </View>
      </View>
    </Modal>
  );
}

function RewardTile({
  emoji,
  title,
  value,
  done,
  onPress,
}: {
  emoji: string;
  title: string;
  value: string;
  done: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} disabled={done} style={[styles.tile, done && styles.tileDone]}>
      <Text style={styles.tileEmoji}>{emoji}</Text>
      <View style={styles.tileBody}>
        <Text style={styles.tileTitle}>{title}</Text>
        <Text style={[styles.tileValue, done && styles.tileValueDone]}>{value}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 14, paddingTop: 62, gap: 12, paddingBottom: 30 },
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
  progressStrong: { fontWeight: "800", color: colors.text, fontSize: 15 },
  sectionTitle: { fontSize: 13, fontWeight: "800", color: colors.text, marginBottom: 10 },
  milestoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  milestoneSteps: { width: 78, fontSize: 15, fontWeight: "800", color: colors.text },
  milestonePt: { flex: 1, fontSize: 13, fontWeight: "700", color: colors.point },
  milestoneBtn: {
    backgroundColor: colors.dark,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 14,
    minWidth: 96,
    alignItems: "center",
  },
  milestoneBtnDone: { backgroundColor: colors.border },
  milestoneBtnLocked: { backgroundColor: colors.bg },
  milestoneBtnText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  milestoneBtnTextDim: { color: colors.textSub },
  allDone: { fontSize: 13, fontWeight: "700", color: colors.free, marginTop: 8 },
  tileGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: {
    flexBasis: "47%",
    flexGrow: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tileDone: { opacity: 0.55 },
  tileEmoji: { fontSize: 26 },
  tileBody: { flex: 1 },
  tileTitle: { fontSize: 13, fontWeight: "800", color: colors.text },
  tileValue: { fontSize: 12, fontWeight: "700", color: colors.gold, marginTop: 2 },
  tileValueDone: { color: colors.textSub },
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
  loginBanner: {
    backgroundColor: "#fdf6e3",
    borderRadius: 12,
    padding: 12,
  },
  loginBannerText: { fontSize: 12, color: "#7a6420", lineHeight: 17, fontWeight: "600" },
  adOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  adBox: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    width: "100%",
    maxWidth: 320,
  },
  adLabel: { fontSize: 11, color: colors.textSub, alignSelf: "flex-start" },
  adEmoji: { fontSize: 48, marginVertical: 12 },
  adText: { fontSize: 12, color: colors.textSub, textAlign: "center" },
  adCount: { fontSize: 16, fontWeight: "800", color: colors.text, marginTop: 10 },
});
