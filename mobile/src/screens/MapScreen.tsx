import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import SpotMap, { SpotMapHandle } from "../components/SpotMap";
import SpotDetailSheet from "../components/SpotDetailSheet";
import { CATEGORIES, REGIONS, SAMPLE_SPOTS, categoryOf } from "../data/spots";
import { syncComment, syncRating, syncVote } from "../lib/socialRepo";
import { fetchSpots, submitSpot } from "../lib/spotsRepo";
import { getJSON, setJSON, KEYS } from "../lib/storage";
import { colors, priceColor } from "../theme";
import { CategoryId, CommentMap, RatingMap, Spot, SpotComment, VoteDir, VoteMap } from "../types";

const PRICE_PRESETS = [
  { label: "〜500円", value: 500 },
  { label: "〜800円", value: 800 },
  { label: "〜1000円", value: 1000 },
];

const POST_HINT = Platform.OS === "web" ? "右クリックでお店を投稿" : "長押しでお店を投稿";

export default function MapScreen() {
  const [maxPrice, setMaxPrice] = useState(800);
  const [activeCategories, setActiveCategories] = useState<Set<CategoryId>>(
    new Set(CATEGORIES.map((c) => c.id)),
  );
  const [spots, setSpots] = useState<Spot[]>(SAMPLE_SPOTS);
  const [votes, setVotes] = useState<VoteMap>({});
  const [ratings, setRatings] = useState<RatingMap>({});
  const [comments, setComments] = useState<CommentMap>({});
  const [favorites, setFavorites] = useState<string[]>([]);
  const [favOnly, setFavOnly] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [selected, setSelected] = useState<Spot | null>(null);
  const [pendingCoord, setPendingCoord] = useState<{ lat: number; lng: number } | null>(null);
  const mapRef = useRef<SpotMapHandle>(null);

  useEffect(() => {
    fetchSpots().then(setSpots);
    getJSON<VoteMap>(KEYS.votes, {}).then(setVotes);
    getJSON<RatingMap>(KEYS.ratings, {}).then(setRatings);
    getJSON<CommentMap>(KEYS.comments, {}).then(setComments);
    getJSON<string[]>(KEYS.favorites, []).then(setFavorites);
  }, []);

  const visibleSpots = useMemo(
    () =>
      spots.filter(
        (s) =>
          (s.price === 0 || s.price <= maxPrice) &&
          activeCategories.has(s.category) &&
          (!favOnly || favorites.includes(s.id)),
      ),
    [spots, maxPrice, activeCategories, favOnly, favorites],
  );

  function toggleCategory(id: CategoryId) {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function vote(spot: Spot, dir: VoteDir) {
    setVotes((prev) => {
      const next: VoteMap = { ...prev };
      if (next[spot.id] === dir) delete next[spot.id];
      else next[spot.id] = dir;
      void setJSON(KEYS.votes, next);
      void syncVote(spot.id, next[spot.id] ?? null); // サーバーモード時はwrite-through
      return next;
    });
  }

  function rate(spot: Spot, stars: number) {
    setRatings((prev) => {
      const next: RatingMap = { ...prev };
      if (next[spot.id] === stars) delete next[spot.id];
      else next[spot.id] = stars;
      void setJSON(KEYS.ratings, next);
      void syncRating(spot.id, next[spot.id] ?? null);
      return next;
    });
  }

  function toggleFavorite(spot: Spot) {
    setFavorites((prev) => {
      const next = prev.includes(spot.id)
        ? prev.filter((id) => id !== spot.id)
        : [...prev, spot.id];
      void setJSON(KEYS.favorites, next);
      return next;
    });
  }

  function addComment(spot: Spot, text: string) {
    setComments((prev) => {
      const entry: SpotComment = { id: "c" + Date.now(), text, at: Date.now() };
      const next: CommentMap = { ...prev, [spot.id]: [entry, ...(prev[spot.id] ?? [])] };
      void setJSON(KEYS.comments, next);
      void syncComment(spot.id, text);
      return next;
    });
  }

  async function addSpot(spot: Spot) {
    setPendingCoord(null);
    try {
      const result = await submitSpot(spot);
      if (result.pendingApproval) {
        notify("投稿ありがとうございます!承認後に地図に表示されます");
        return;
      }
      setSpots(await fetchSpots());
      mapRef.current?.focusSpot(spot);
    } catch {
      notify("投稿に失敗しました。通信環境を確認してもう一度お試しください");
    }
  }

  function notify(message: string) {
    if (Platform.OS === "web") window.alert(message);
    else Alert.alert(message);
  }

  function openFromList(spot: Spot) {
    setListOpen(false);
    setSelected(spot);
    mapRef.current?.focusSpot(spot);
  }

  return (
    <View style={styles.container}>
      <SpotMap
        ref={mapRef}
        spots={visibleSpots}
        onSelectSpot={setSelected}
        onPickLocation={(coord) => {
          setSelected(null);
          setPendingCoord(coord);
        }}
        onMapPress={() => setSelected(null)}
      />

      {/* フィルタ(チップ列。上のフローティングバーの下) */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {REGIONS.map((r) => (
            <Chip
              key={r.id}
              label={`🏙 ${r.label}`}
              active={false}
              onPress={() => mapRef.current?.focusRegion(r.lat, r.lng)}
            />
          ))}
          <View style={styles.chipDivider} />
          {PRICE_PRESETS.map((p) => (
            <Chip
              key={p.value}
              label={p.label}
              active={maxPrice === p.value}
              onPress={() => setMaxPrice(p.value)}
            />
          ))}
          <View style={styles.chipDivider} />
          {CATEGORIES.map((c) => (
            <Chip
              key={c.id}
              label={`${c.emoji} ${c.label}`}
              active={activeCategories.has(c.id)}
              onPress={() => toggleCategory(c.id)}
            />
          ))}
        </ScrollView>
      </View>

      {/* 右側の丸ボタン群(お気に入りフィルタ) */}
      <View style={styles.sideButtons}>
        <RoundButton
          label={favOnly ? "❤️" : "🤍"}
          active={favOnly}
          onPress={() => setFavOnly((v) => !v)}
        />
      </View>

      <View style={styles.hintBadge}>
        <Text style={styles.hintText}>
          {POST_HINT} ・ 表示中 {visibleSpots.length}件
        </Text>
      </View>

      {/* 左下:現在地 / 右下:リスト */}
      <View style={styles.bottomLeft}>
        <RoundButton label="🎯" onPress={() => void mapRef.current?.locateMe()} />
      </View>
      <View style={styles.bottomRight}>
        <RoundButton label="📋" onPress={() => setListOpen(true)} />
      </View>

      {selected && (
        <SpotDetailSheet
          spot={selected}
          myVote={votes[selected.id]}
          onVote={(dir) => vote(selected, dir)}
          myRating={ratings[selected.id]}
          onRate={(stars) => rate(selected, stars)}
          isFavorite={favorites.includes(selected.id)}
          onToggleFavorite={() => toggleFavorite(selected)}
          comments={comments[selected.id] ?? []}
          onAddComment={(text) => addComment(selected, text)}
          onClose={() => setSelected(null)}
        />
      )}

      <SpotListModal
        visible={listOpen}
        spots={visibleSpots}
        onClose={() => setListOpen(false)}
        onPick={openFromList}
      />

      <AddSpotModal coord={pendingCoord} onClose={() => setPendingCoord(null)} onSubmit={addSpot} />
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function RoundButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.roundBtn, active && styles.roundBtnActive]}>
      <Text style={styles.roundBtnText}>{label}</Text>
    </Pressable>
  );
}

/* 安い順リスト(참고앱の一覧ビュー相当) */
function SpotListModal({
  visible,
  spots,
  onClose,
  onPick,
}: {
  visible: boolean;
  spots: Spot[];
  onClose: () => void;
  onPick: (spot: Spot) => void;
}) {
  const sorted = [...spots].sort((a, b) => a.price - b.price);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modal, styles.listModal]}>
          <Text style={styles.modalTitle}>安い順リスト({sorted.length}件)</Text>
          <ScrollView>
            {sorted.map((s) => (
              <Pressable key={s.id} onPress={() => onPick(s)} style={styles.listItem}>
                <Text style={styles.listEmoji}>{categoryOf(s.category)?.emoji}</Text>
                <View style={styles.listBody}>
                  <Text style={styles.listName} numberOfLines={1}>
                    {s.name}
                  </Text>
                  {s.menu ? (
                    <Text style={styles.listMenu} numberOfLines={1}>
                      {s.menu}
                    </Text>
                  ) : null}
                </View>
                <Text style={[styles.listPrice, { color: priceColor(s.price) }]}>
                  {s.price === 0 ? "無料" : `¥${s.price}`}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <Pressable onPress={onClose} style={styles.btnDark}>
            <Text style={styles.btnDarkText}>閉じる</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function AddSpotModal({
  coord,
  onClose,
  onSubmit,
}: {
  coord: { lat: number; lng: number } | null;
  onClose: () => void;
  onSubmit: (spot: Spot) => void;
}) {
  const [name, setName] = useState("");
  const [menu, setMenu] = useState("");
  const [price, setPrice] = useState("");
  const [hours, setHours] = useState("");
  const [comment, setComment] = useState("");
  const [category, setCategory] = useState<CategoryId>("teishoku");

  useEffect(() => {
    if (coord) {
      setName("");
      setMenu("");
      setPrice("");
      setHours("");
      setComment("");
      setCategory("teishoku");
    }
  }, [coord]);

  function warn(message: string) {
    if (Platform.OS === "web") window.alert(message);
    else Alert.alert(message);
  }

  function submit() {
    const priceNum = Number(price);
    if (!name.trim()) {
      warn("店名を入力してください");
      return;
    }
    if (!Number.isFinite(priceNum) || priceNum < 0 || price.trim() === "") {
      warn("価格を数字で入力してください(無料なら0)");
      return;
    }
    if (priceNum > 1000) {
      warn("1000円以下のスポットのみ投稿できます");
      return;
    }
    if (!coord) return;
    onSubmit({
      id: "u" + Date.now(),
      name: name.trim(),
      category,
      price: priceNum,
      lat: coord.lat,
      lng: coord.lng,
      menu: menu.trim() || undefined,
      hours: hours.trim() || undefined,
      comment: comment.trim() || undefined,
      up: 0,
      down: 0,
      createdAt: Date.now(),
    });
  }

  return (
    <Modal visible={coord != null} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.modalOverlay}
      >
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>スポットを投稿</Text>
          <TextInput
            style={styles.input}
            placeholder="店名(例:富士そば 新宿店)"
            placeholderTextColor={colors.textSub}
            value={name}
            onChangeText={setName}
            maxLength={40}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modalChips}>
            {CATEGORIES.map((c) => (
              <View key={c.id} style={styles.modalChipSpacer}>
                <Chip
                  label={`${c.emoji} ${c.label}`}
                  active={category === c.id}
                  onPress={() => setCategory(c.id)}
                />
              </View>
            ))}
          </ScrollView>
          <TextInput
            style={styles.input}
            placeholder="メニュー名(例:かけそば)"
            placeholderTextColor={colors.textSub}
            value={menu}
            onChangeText={setMenu}
            maxLength={30}
          />
          <TextInput
            style={styles.input}
            placeholder="価格(円・無料なら0)"
            placeholderTextColor={colors.textSub}
            value={price}
            onChangeText={setPrice}
            keyboardType="number-pad"
            maxLength={4}
          />
          <TextInput
            style={styles.input}
            placeholder="営業時間(任意 例:11:00-21:00)"
            placeholderTextColor={colors.textSub}
            value={hours}
            onChangeText={setHours}
            maxLength={40}
          />
          <TextInput
            style={styles.input}
            placeholder="ひとことメモ(任意)"
            placeholderTextColor={colors.textSub}
            value={comment}
            onChangeText={setComment}
            maxLength={80}
          />
          <Text style={styles.modalNote}>※ 1000円以下のスポットのみ投稿できます</Text>
          <View style={styles.modalActions}>
            <Pressable onPress={onClose} style={styles.btnGhost}>
              <Text style={styles.btnGhostText}>やめる</Text>
            </Pressable>
            <Pressable onPress={submit} style={styles.btnDark}>
              <Text style={styles.btnDarkText}>投稿する</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  filterBar: { position: "absolute", top: 58, left: 0, right: 0, zIndex: 1000 },
  chipRow: { paddingHorizontal: 10, gap: 6, alignItems: "center" },
  chipDivider: { width: 1, height: 20, backgroundColor: colors.border, marginHorizontal: 4 },
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
  sideButtons: { position: "absolute", top: 100, right: 10, gap: 8, zIndex: 1000 },
  roundBtn: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  roundBtnActive: { borderWidth: 2, borderColor: colors.primary },
  roundBtnText: { fontSize: 18 },
  hintBadge: {
    position: "absolute",
    top: 100,
    alignSelf: "center",
    backgroundColor: "rgba(38,37,31,0.78)",
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 12,
    zIndex: 1000,
  },
  hintText: { color: "#fff", fontSize: 11 },
  bottomLeft: { position: "absolute", left: 12, bottom: 20, zIndex: 1000 },
  bottomRight: { position: "absolute", right: 12, bottom: 20, zIndex: 1000 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modal: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 32,
    ...(Platform.OS === "web" ? { maxWidth: 480, width: "100%", alignSelf: "center" as const } : null),
  },
  listModal: { maxHeight: "70%" },
  modalTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 12 },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  listEmoji: { fontSize: 20 },
  listBody: { flex: 1 },
  listName: { fontSize: 14, fontWeight: "600", color: colors.text },
  listMenu: { fontSize: 12, color: colors.textSub },
  listPrice: { fontSize: 14, fontWeight: "800" },
  modalChips: { marginBottom: 10, flexGrow: 0 },
  modalChipSpacer: { marginRight: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: colors.text,
    marginBottom: 10,
  },
  modalNote: { fontSize: 11, color: colors.textSub, marginBottom: 12 },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10 },
  btnGhost: { paddingVertical: 10, paddingHorizontal: 14 },
  btnGhostText: { color: colors.textSub, fontSize: 14 },
  btnDark: {
    backgroundColor: colors.dark,
    borderRadius: 999,
    paddingVertical: 11,
    paddingHorizontal: 20,
    alignItems: "center",
    marginTop: 10,
  },
  btnDarkText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});
