import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { usePoints } from "../context/PointsContext";
import {
  GIFT_BRANDS,
  GiftBrandId,
  GiftListing,
  ListingType,
  SAMPLE_LISTINGS,
  TradeState,
  giftBrandOf,
} from "../data/gifts";
import { RAFFLES, WINNER_FEED, formatCountdown } from "../data/raffles";
import { getJSON, setJSON, KEYS } from "../lib/storage";
import { colors } from "../theme";

type Filter = "all" | "sell" | "exchange" | "mine";

export default function GiftScreen() {
  const { balance, addPoints } = usePoints();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [myListings, setMyListings] = useState<GiftListing[]>([]);
  const [tradeStates, setTradeStates] = useState<Record<string, TradeState>>({});
  const [openListing, setOpenListing] = useState<GiftListing | null>(null);
  const [posting, setPosting] = useState(false);
  const [raffleEntries, setRaffleEntries] = useState<Record<string, number>>({});
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    getJSON<GiftListing[]>(KEYS.giftListings, []).then(setMyListings);
    getJSON<Record<string, TradeState>>(KEYS.giftTrades, {}).then(setTradeStates);
    getJSON<Record<string, number>>(KEYS.raffleEntries, {}).then(setRaffleEntries);
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  async function enterRaffle(raffleId: string) {
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

  const listings = useMemo(
    () => [...myListings, ...SAMPLE_LISTINGS].sort((a, b) => b.createdAt - a.createdAt),
    [myListings],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return listings.filter((l) => {
      if (filter === "sell" && l.type !== "sell") return false;
      if (filter === "exchange" && l.type !== "exchange") return false;
      if (filter === "mine" && !l.mine) return false;
      if (!q) return true;
      const brand = giftBrandOf(l.brand);
      const haystack = [brand?.label ?? "", l.note ?? "", l.wants ?? "", String(l.faceValue)]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [listings, query, filter]);

  function setTradeState(id: string, state: TradeState) {
    setTradeStates((prev) => {
      const next = { ...prev, [id]: state };
      void setJSON(KEYS.giftTrades, next);
      return next;
    });
  }

  async function requestTrade(listing: GiftListing) {
    if (listing.type === "sell" && listing.pricePt != null) {
      if (balance < listing.pricePt) return; // ボタン側でも無効化している
      await addPoints(-listing.pricePt);
    }
    setTradeState(listing.id, "requested");
  }

  async function addListing(listing: GiftListing) {
    const next = [listing, ...myListings];
    setMyListings(next);
    await setJSON(KEYS.giftListings, next);
    setPosting(false);
  }

  async function removeListing(id: string) {
    const next = myListings.filter((l) => l.id !== id);
    setMyListings(next);
    await setJSON(KEYS.giftListings, next);
    setOpenListing(null);
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heading}>ギフト券マーケット</Text>
            <Text style={styles.subheading}>
              使わないギフト券をポイントで売買・交換。残高 ✨{balance}pt
            </Text>
          </View>
          <Pressable onPress={() => setPosting(true)} style={styles.postBtn}>
            <Text style={styles.postBtnText}>＋出品</Text>
          </Pressable>
        </View>

        {/* 安全に関する注意 */}
        <View style={styles.noticeBox}>
          <Text style={styles.noticeText}>
            ⚠️ 取引成立までギフトコードを直接書かない・送らないでください。コードの受け渡しは今後のアップデートでアプリが仲介(エスクロー)します。現金での売買は禁止です。
          </Text>
        </View>

        {/* チリツモ抽選(참고앱の티끌드로우) */}
        <Text style={styles.raffleHeading}>🎯 チリツモ抽選</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.raffleRow}>
          {RAFFLES.map((r) => {
            const mine = raffleEntries[r.id] ?? 0;
            const left = r.maxEntries - mine;
            const ended = r.endsAt <= now;
            const canEnter = !ended && left > 0 && balance >= r.costPt;
            return (
              <View key={r.id} style={styles.raffleCard}>
                <Text style={styles.raffleEmoji}>{r.emoji}</Text>
                <Text style={styles.raffleTitle} numberOfLines={1}>
                  {r.title}
                </Text>
                <View style={styles.raffleBtnRow}>
                  <View style={styles.raffleCost}>
                    <Text style={styles.raffleCostText}>{r.costPt}pt</Text>
                  </View>
                  <Pressable
                    onPress={() => void enterRaffle(r.id)}
                    disabled={!canEnter}
                    style={[styles.raffleBtn, !canEnter && styles.raffleBtnDisabled]}
                  >
                    <Text style={styles.raffleBtnText}>
                      {ended
                        ? "受付終了"
                        : left <= 0
                          ? "応募済み(上限)"
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
              <Text style={styles.winnerStatus}>{w.status}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.raffleHeading}>🛍 出品一覧</Text>

        {/* 検索 + フィルタ */}
        <TextInput
          style={styles.search}
          placeholder="🔍 ブランド名で検索(例:Amazon、スタバ)"
          placeholderTextColor={colors.textSub}
          value={query}
          onChangeText={setQuery}
        />
        <View style={styles.chipRow}>
          <Chip label="すべて" active={filter === "all"} onPress={() => setFilter("all")} />
          <Chip label="💰 販売" active={filter === "sell"} onPress={() => setFilter("sell")} />
          <Chip label="🔄 交換" active={filter === "exchange"} onPress={() => setFilter("exchange")} />
          <Chip label="⭐ 自分" active={filter === "mine"} onPress={() => setFilter("mine")} />
        </View>

        {results.length === 0 && (
          <Text style={styles.empty}>該当する出品がありません</Text>
        )}
        {results.map((l) => {
          const brand = giftBrandOf(l.brand);
          const state = tradeStates[l.id];
          return (
            <Pressable key={l.id} style={styles.card} onPress={() => setOpenListing(l)}>
              <Text style={styles.cardEmoji}>{brand?.emoji}</Text>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>
                  {brand?.label} <Text style={styles.cardFace}>{l.faceValue.toLocaleString()}円分</Text>
                </Text>
                <Text style={styles.cardSub} numberOfLines={1}>
                  {l.type === "sell" ? l.note ?? "" : `交換希望:${l.wants ?? ""}`}
                </Text>
                <Text style={styles.cardSeller}>
                  {l.mine ? "⭐ 自分の出品" : l.seller}・{daysAgo(l.createdAt)}
                </Text>
              </View>
              <View style={styles.cardRight}>
                {state ? (
                  <Text style={styles.stateBadge}>{state === "requested" ? "取引中" : "成立"}</Text>
                ) : l.type === "sell" ? (
                  <Text style={styles.pricePt}>✨{l.pricePt}pt</Text>
                ) : (
                  <Text style={styles.exchangeBadge}>🔄 交換</Text>
                )}
              </View>
            </Pressable>
          );
        })}

        <Text style={styles.disclaimer}>
          ※ MVPデモ:出品はこの端末に保存され、取引はシミュレーションです。実際のユーザー間取引にはサーバー・本人確認・コード預かり(エスクロー)と法令(古物営業法・資金決済法など)の確認が必要です。
        </Text>
      </ScrollView>

      {openListing && (
        <ListingDetailModal
          listing={openListing}
          state={tradeStates[openListing.id]}
          balance={balance}
          onTrade={() => void requestTrade(openListing)}
          onRemove={() => void removeListing(openListing.id)}
          onClose={() => setOpenListing(null)}
        />
      )}

      <PostListingModal
        visible={posting}
        onClose={() => setPosting(false)}
        onSubmit={(l) => void addListing(l)}
      />
    </View>
  );
}

function daysAgo(at: number): string {
  const days = Math.floor((Date.now() - at) / (24 * 60 * 60 * 1000));
  if (days < 1) return "今日";
  return `${days}日前`;
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function ListingDetailModal({
  listing,
  state,
  balance,
  onTrade,
  onRemove,
  onClose,
}: {
  listing: GiftListing;
  state?: TradeState;
  balance: number;
  onTrade: () => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const brand = giftBrandOf(listing.brand);
  const isSell = listing.type === "sell";
  const canAfford = !isSell || listing.pricePt == null || balance >= listing.pricePt;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modal}>
          <Text style={styles.detailEmoji}>{brand?.emoji}</Text>
          <Text style={styles.detailTitle}>
            {brand?.label} {listing.faceValue.toLocaleString()}円分
          </Text>
          <Text style={styles.detailSeller}>
            出品者:{listing.mine ? "自分" : listing.seller}・{daysAgo(listing.createdAt)}
          </Text>

          {isSell ? (
            <Text style={styles.detailPrice}>✨ {listing.pricePt}pt</Text>
          ) : (
            <Text style={styles.detailWants}>🔄 交換希望:{listing.wants}</Text>
          )}
          {listing.note ? <Text style={styles.detailNote}>{listing.note}</Text> : null}

          {state === "requested" && (
            <View style={styles.noticeBox}>
              <Text style={styles.noticeText}>
                🤝 取引申請済み。コードの受け渡し(エスクロー)はサーバー対応後に有効になります。
              </Text>
            </View>
          )}

          {listing.mine ? (
            <Pressable onPress={onRemove} style={[styles.btnDark, styles.btnDanger]}>
              <Text style={styles.btnDarkText}>出品を取り下げる</Text>
            </Pressable>
          ) : state ? null : (
            <Pressable
              onPress={onTrade}
              disabled={!canAfford}
              style={[styles.btnDark, !canAfford && styles.btnDisabled]}
            >
              <Text style={styles.btnDarkText}>
                {isSell
                  ? canAfford
                    ? `✨${listing.pricePt}ptで購入を申し込む`
                    : `ポイント不足(残高✨${balance}pt)`
                  : "交換を申し込む"}
              </Text>
            </Pressable>
          )}

          <Pressable onPress={onClose} style={styles.btnGhost}>
            <Text style={styles.btnGhostText}>閉じる</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function PostListingModal({
  visible,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (listing: GiftListing) => void;
}) {
  const [type, setType] = useState<ListingType>("sell");
  const [brand, setBrand] = useState<GiftBrandId>("amazon");
  const [faceValue, setFaceValue] = useState("");
  const [pricePt, setPricePt] = useState("");
  const [wants, setWants] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (visible) {
      setType("sell");
      setBrand("amazon");
      setFaceValue("");
      setPricePt("");
      setWants("");
      setNote("");
    }
  }, [visible]);

  function warn(message: string) {
    if (Platform.OS === "web") window.alert(message);
    else Alert.alert(message);
  }

  const CODE_PATTERN = /[A-Z0-9]{4}[-\s]?[A-Z0-9]{4,}/i;

  function submit() {
    const face = Number(faceValue);
    if (!Number.isFinite(face) || face < 100 || faceValue.trim() === "") {
      warn("額面を100円以上の数字で入力してください");
      return;
    }
    if (type === "sell") {
      const pt = Number(pricePt);
      if (!Number.isFinite(pt) || pt <= 0 || pricePt.trim() === "") {
        warn("販売価格(pt)を入力してください");
        return;
      }
      if (pt > face) {
        warn("額面より高い価格では出品できません");
        return;
      }
    } else if (!wants.trim()) {
      warn("交換希望の内容を入力してください");
      return;
    }
    if (CODE_PATTERN.test(note) || CODE_PATTERN.test(wants)) {
      warn("ギフトコードらしき文字列は書けません。コードは取引成立後の受け渡しで扱います");
      return;
    }
    onSubmit({
      id: "g" + Date.now(),
      brand,
      faceValue: face,
      type,
      pricePt: type === "sell" ? Number(pricePt) : undefined,
      wants: type === "exchange" ? wants.trim() : undefined,
      note: note.trim() || undefined,
      seller: "自分",
      mine: true,
      createdAt: Date.now(),
    });
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modal}>
          <ScrollView>
            <Text style={styles.detailTitle}>ギフト券を出品</Text>

            <View style={[styles.chipRow, { marginTop: 10 }]}>
              <Chip label="💰 ポイントで販売" active={type === "sell"} onPress={() => setType("sell")} />
              <Chip label="🔄 交換に出す" active={type === "exchange"} onPress={() => setType("exchange")} />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.brandScroll}>
              {GIFT_BRANDS.map((b) => (
                <View key={b.id} style={{ marginRight: 6 }}>
                  <Chip
                    label={`${b.emoji} ${b.label}`}
                    active={brand === b.id}
                    onPress={() => setBrand(b.id)}
                  />
                </View>
              ))}
            </ScrollView>

            <TextInput
              style={styles.input}
              placeholder="額面(円)例:500"
              placeholderTextColor={colors.textSub}
              value={faceValue}
              onChangeText={setFaceValue}
              keyboardType="number-pad"
              maxLength={6}
            />
            {type === "sell" ? (
              <TextInput
                style={styles.input}
                placeholder="販売価格(pt)例:450 ※額面以下"
                placeholderTextColor={colors.textSub}
                value={pricePt}
                onChangeText={setPricePt}
                keyboardType="number-pad"
                maxLength={6}
              />
            ) : (
              <TextInput
                style={styles.input}
                placeholder="交換希望(例:図書カード500円分)"
                placeholderTextColor={colors.textSub}
                value={wants}
                onChangeText={setWants}
                maxLength={60}
              />
            )}
            <TextInput
              style={styles.input}
              placeholder="ひとこと(任意)※コードは書かない"
              placeholderTextColor={colors.textSub}
              value={note}
              onChangeText={setNote}
              maxLength={80}
            />
            <Text style={styles.modalNote}>
              ※ ギフトコード自体は絶対に記載しないでください。取引成立後の受け渡しはアプリが仲介予定です。
            </Text>

            <Pressable onPress={submit} style={styles.btnDark}>
              <Text style={styles.btnDarkText}>出品する</Text>
            </Pressable>
            <Pressable onPress={onClose} style={styles.btnGhost}>
              <Text style={styles.btnGhostText}>やめる</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 14, paddingTop: 62, paddingBottom: 30 },
  headRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  heading: { fontSize: 20, fontWeight: "800", color: colors.text },
  subheading: { fontSize: 12, color: colors.textSub, marginTop: 4 },
  postBtn: {
    backgroundColor: colors.dark,
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  postBtnText: { color: "#fff", fontSize: 13, fontWeight: "800" },
  noticeBox: {
    backgroundColor: "#fdf6e3",
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
  },
  noticeText: { fontSize: 11, color: "#7a6420", lineHeight: 16 },
  raffleHeading: { fontSize: 15, fontWeight: "800", color: colors.text, marginTop: 16 },
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
  raffleCost: {
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  raffleCostText: { fontSize: 12, fontWeight: "800", color: "#8a6d00" },
  raffleBtn: {
    flex: 1,
    backgroundColor: colors.dark,
    borderRadius: 999,
    paddingVertical: 9,
    alignItems: "center",
  },
  raffleBtnDisabled: { backgroundColor: colors.border },
  raffleBtnText: { fontSize: 11, fontWeight: "800", color: "#fff" },
  raffleDeadline: {
    backgroundColor: "#fdeaea",
    borderRadius: 999,
    paddingVertical: 5,
    alignItems: "center",
    marginTop: 8,
  },
  raffleDeadlineText: { fontSize: 12, fontWeight: "800", color: colors.newBadge },
  raffleMeta: { fontSize: 11, color: colors.textSub, textAlign: "center", marginTop: 6 },
  winnerCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    marginTop: 4,
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
  winnerStatus: { fontSize: 11, fontWeight: "700", color: colors.free },
  search: {
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 16,
    fontSize: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 10,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  chip: {
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.dark, borderColor: colors.dark },
  chipText: { fontSize: 12, color: colors.text },
  chipTextActive: { color: "#fff", fontWeight: "700" },
  empty: { fontSize: 13, color: colors.textSub, textAlign: "center", marginTop: 30 },
  card: {
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
  cardEmoji: { fontSize: 28 },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: "800", color: colors.text },
  cardFace: { color: colors.primary },
  cardSub: { fontSize: 12, color: colors.textSub, marginTop: 2 },
  cardSeller: { fontSize: 10, color: colors.textSub, marginTop: 4 },
  cardRight: { alignItems: "flex-end" },
  pricePt: { fontSize: 15, fontWeight: "800", color: colors.text },
  exchangeBadge: { fontSize: 12, fontWeight: "700", color: colors.point },
  stateBadge: { fontSize: 11, fontWeight: "800", color: colors.free },
  disclaimer: { fontSize: 10, color: colors.textSub, marginTop: 16, lineHeight: 15 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modal: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
    maxHeight: "85%",
    ...(Platform.OS === "web" ? { maxWidth: 520, width: "100%", alignSelf: "center" as const } : null),
  },
  detailEmoji: { fontSize: 40 },
  detailTitle: { fontSize: 18, fontWeight: "800", color: colors.text, marginTop: 6 },
  detailSeller: { fontSize: 12, color: colors.textSub, marginTop: 4 },
  detailPrice: { fontSize: 26, fontWeight: "800", color: colors.text, marginTop: 10 },
  detailWants: { fontSize: 15, fontWeight: "700", color: colors.point, marginTop: 10 },
  detailNote: { fontSize: 13, color: colors.text, marginTop: 8, lineHeight: 19 },
  btnDark: {
    backgroundColor: colors.dark,
    borderRadius: 999,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 16,
  },
  btnDanger: { backgroundColor: colors.newBadge },
  btnDisabled: { backgroundColor: colors.border },
  btnDarkText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  btnGhost: { alignItems: "center", paddingVertical: 12 },
  btnGhostText: { color: colors.textSub, fontSize: 13 },
  brandScroll: { marginTop: 10, flexGrow: 0 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: colors.text,
    marginTop: 10,
  },
  modalNote: { fontSize: 11, color: colors.textSub, marginTop: 10, lineHeight: 16 },
});
