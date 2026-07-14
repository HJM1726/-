import React, { useEffect, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import LoginModal from "../components/LoginModal";
import { useAccount } from "../context/AccountContext";
import { usePoints } from "../context/PointsContext";
import { COUPONS, MyCoupon, couponOf } from "../data/coupons";
import { RAFFLES, WINNER_FEED, formatCountdown } from "../data/raffles";
import { getJSON, setJSON, KEYS } from "../lib/storage";
import { colors } from "../theme";

/* 交換所(B2C)。
 * 참고앱の教訓に従い、ユーザー間のギフト券売買(C2C)は行わない:
 * 詐欺リスクと古物営業法などの規制リスクが大きく、大手フリマアプリも禁止している領域。
 * 代わりに運営提供クーポンへの交換と、ポイント消費の抽選(チリツモ抽選)を提供する。 */
export default function GiftScreen() {
  const { balance, addPoints } = usePoints();
  const { account } = useAccount();
  const [raffleEntries, setRaffleEntries] = useState<Record<string, number>>({});
  const [myCoupons, setMyCoupons] = useState<MyCoupon[]>([]);
  const [loginVisible, setLoginVisible] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    getJSON<Record<string, number>>(KEYS.raffleEntries, {}).then(setRaffleEntries);
    getJSON<MyCoupon[]>(KEYS.myCoupons, []).then(setMyCoupons);
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  function requireLogin(): boolean {
    if (account) return false;
    setLoginVisible(true);
    return true;
  }

  function notify(message: string) {
    if (Platform.OS === "web") window.alert(message);
  }

  async function enterRaffle(raffleId: string) {
    if (requireLogin()) return;
    const raffle = RAFFLES.find((r) => r.id === raffleId);
    if (!raffle) return;
    const mine = raffleEntries[raffleId] ?? 0;
    if (mine >= raffle.maxEntries || balance < raffle.costPt || raffle.endsAt <= now) return;
    await addPoints(-raffle.costPt);
    setRaffleEntries((prev) => {
      const next = { ...prev, [raffleId]: (prev[raffleId] ?? 0) + 1 };
      void setJSON(KEYS.raffleEntries, next);
      return next;
    });
  }

  async function exchangeCoupon(couponId: string) {
    if (requireLogin()) return;
    const coupon = couponOf(couponId);
    if (!coupon || balance < coupon.costPt) return;
    await addPoints(-coupon.costPt);
    const entry: MyCoupon = {
      id: "x" + Date.now(),
      couponId,
      exchangedAt: Date.now(),
      status: "preparing",
    };
    const next = [entry, ...myCoupons];
    setMyCoupons(next);
    await setJSON(KEYS.myCoupons, next);
    notify("交換を受け付けました!クーポンは「交換済み」欄で確認できます(手配中)");
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>交換所</Text>
        <Text style={styles.subheading}>
          ためたチリツモをクーポンや抽選に。残高 ✨{balance}pt
          {account ? ` ・ ${account.nickname}さん` : ""}
        </Text>

        {!account && (
          <Pressable onPress={() => setLoginVisible(true)} style={styles.loginBanner}>
            <Text style={styles.loginBannerText}>
              🔒 交換・応募にはログイン(ニックネーム登録)が必要です。タップして登録
            </Text>
          </Pressable>
        )}

        {/* チリツモ抽選 */}
        <Text style={styles.sectionHeading}>🎯 チリツモ抽選</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.raffleRow}>
          {RAFFLES.map((r) => {
            const mine = raffleEntries[r.id] ?? 0;
            const left = r.maxEntries - mine;
            const ended = r.endsAt <= now;
            const disabled = ended || left <= 0 || (account != null && balance < r.costPt);
            return (
              <View key={r.id} style={styles.raffleCard}>
                <Text style={styles.raffleEmoji}>{r.emoji}</Text>
                <Text style={styles.raffleTitle} numberOfLines={1}>
                  {r.title}
                </Text>
                <View style={styles.raffleBtnRow}>
                  <View style={styles.costPill}>
                    <Text style={styles.costPillText}>{r.costPt}pt</Text>
                  </View>
                  <Pressable
                    onPress={() => void enterRaffle(r.id)}
                    disabled={disabled}
                    style={[styles.btnDarkSmall, disabled && styles.btnDisabled]}
                  >
                    <Text style={styles.btnDarkText}>
                      {ended
                        ? "受付終了"
                        : left <= 0
                          ? "応募済み(上限)"
                          : !account
                            ? "ログインして応募"
                            : balance < r.costPt
                              ? "ポイント不足"
                              : `参加する・残り${left}回`}
                    </Text>
                  </Pressable>
                </View>
                <View style={styles.raffleDeadline}>
                  <Text style={styles.raffleDeadlineText}>
                    締切まで {formatCountdown(r.endsAt, now)}
                  </Text>
                </View>
                <Text style={styles.raffleMeta}>
                  参加 {r.seedEntrants + mine}人・{r.winners}名抽選
                  {mine > 0 ? ` ・自分${mine}口` : ""}
                </Text>
              </View>
            );
          })}
        </ScrollView>

        {/* クーポン交換カタログ(運営提供・B2C) */}
        <Text style={styles.sectionHeading}>🎫 クーポンに交換</Text>
        {COUPONS.map((c) => {
          const affordable = balance >= c.costPt;
          return (
            <View key={c.id} style={styles.couponCard}>
              <Text style={styles.couponEmoji}>{c.emoji}</Text>
              <View style={styles.couponBody}>
                <Text style={styles.couponTitle}>{c.title}</Text>
                <Text style={styles.couponValue}>
                  {c.value}
                  {c.note ? ` ・${c.note}` : ""}
                </Text>
              </View>
              <Pressable
                onPress={() => void exchangeCoupon(c.id)}
                disabled={account != null && !affordable}
                style={[styles.btnDarkSmall, account != null && !affordable && styles.btnDisabled]}
              >
                <Text style={styles.btnDarkText}>
                  {!account ? `✨${c.costPt}` : affordable ? `✨${c.costPt}で交換` : `✨${c.costPt}(不足)`}
                </Text>
              </Pressable>
            </View>
          );
        })}
        <Text style={styles.catalogNote}>
          ※ クーポンは運営が提供します(ユーザー間のギフト券売買は詐欺・法令リスクのため行いません)。掲載中のブランドは提携前のデモです。
        </Text>

        {/* 交換済み */}
        {myCoupons.length > 0 && (
          <>
            <Text style={styles.sectionHeading}>📬 交換済み</Text>
            {myCoupons.map((m) => {
              const c = couponOf(m.couponId);
              return (
                <View key={m.id} style={styles.myCouponRow}>
                  <Text style={styles.couponEmoji}>{c?.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.couponTitle}>{c?.title}</Text>
                    <Text style={styles.couponValue}>
                      {new Date(m.exchangedAt).toLocaleDateString("ja-JP")} 交換
                    </Text>
                  </View>
                  <Text style={styles.statusText}>
                    {m.status === "preparing" ? "手配中" : "発券済み"}
                  </Text>
                </View>
              );
            })}
          </>
        )}

        {/* 当選フィード */}
        <View style={styles.winnerCard}>
          <Text style={styles.winnerHeading}>🎉 リアルタイム当選フィード</Text>
          {WINNER_FEED.map((w) => (
            <View key={w.id} style={styles.winnerRow}>
              <Text style={styles.winnerEmoji}>{w.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.winnerTitle} numberOfLines={1}>
                  {w.title}
                </Text>
                <Text style={styles.winnerSub}>
                  {w.winner}・{w.agoHours < 24 ? `${w.agoHours}時間前` : `${Math.floor(w.agoHours / 24)}日前`}
                </Text>
              </View>
              <Text style={styles.statusText}>{w.status}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.disclaimer}>
          ※ MVPデモ:交換・応募はこの端末でのシミュレーションです。実際のクーポン発券・抽選はサーバー対応後(景品表示法の確認込み)。
        </Text>
      </ScrollView>

      <LoginModal visible={loginVisible} onClose={() => setLoginVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 14, paddingTop: 62, paddingBottom: 30 },
  heading: { fontSize: 20, fontWeight: "800", color: colors.text },
  subheading: { fontSize: 12, color: colors.textSub, marginTop: 4 },
  loginBanner: {
    backgroundColor: "#fdf6e3",
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
  },
  loginBannerText: { fontSize: 12, color: "#7a6420", lineHeight: 17, fontWeight: "600" },
  sectionHeading: { fontSize: 15, fontWeight: "800", color: colors.text, marginTop: 18 },
  raffleRow: { gap: 10, paddingVertical: 10 },
  raffleCard: {
    width: 250,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  raffleEmoji: { fontSize: 40, textAlign: "center" },
  raffleTitle: { fontSize: 14, fontWeight: "800", color: colors.text, textAlign: "center", marginTop: 6 },
  raffleBtnRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  costPill: {
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  costPillText: { fontSize: 12, fontWeight: "800", color: "#8a6d00" },
  btnDarkSmall: {
    flexShrink: 0,
    backgroundColor: colors.dark,
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 12,
    alignItems: "center",
    flexGrow: 1,
  },
  btnDisabled: { backgroundColor: colors.border },
  btnDarkText: { fontSize: 11, fontWeight: "800", color: "#fff" },
  raffleDeadline: {
    backgroundColor: "#fdeaea",
    borderRadius: 999,
    paddingVertical: 5,
    alignItems: "center",
    marginTop: 8,
  },
  raffleDeadlineText: { fontSize: 12, fontWeight: "800", color: colors.newBadge },
  raffleMeta: { fontSize: 11, color: colors.textSub, textAlign: "center", marginTop: 6 },
  couponCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    marginTop: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  couponEmoji: { fontSize: 26 },
  couponBody: { flex: 1 },
  couponTitle: { fontSize: 14, fontWeight: "700", color: colors.text },
  couponValue: { fontSize: 11, color: colors.textSub, marginTop: 2 },
  catalogNote: { fontSize: 10, color: colors.textSub, marginTop: 10, lineHeight: 15 },
  myCouponRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    marginTop: 10,
  },
  statusText: { fontSize: 11, fontWeight: "700", color: colors.free },
  winnerCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    marginTop: 18,
  },
  winnerHeading: { fontSize: 13, fontWeight: "800", color: colors.text, marginBottom: 4 },
  winnerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  winnerEmoji: { fontSize: 20 },
  winnerTitle: { fontSize: 13, fontWeight: "600", color: colors.text },
  winnerSub: { fontSize: 11, color: colors.textSub },
  disclaimer: { fontSize: 10, color: colors.textSub, marginTop: 16, lineHeight: 15 },
});
