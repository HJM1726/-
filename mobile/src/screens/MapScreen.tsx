import React, { useEffect, useMemo, useState } from "react";
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
import MapView, { LongPressEvent, Marker, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import { CATEGORIES, SAMPLE_SPOTS, categoryOf } from "../data/spots";
import { getJSON, setJSON, KEYS } from "../lib/storage";
import { colors, priceColor } from "../theme";
import { CategoryId, Spot, VoteMap } from "../types";

const PRICE_PRESETS = [
  { label: "〜500円", value: 500 },
  { label: "〜800円", value: 800 },
  { label: "〜1000円", value: 1000 },
];

const INITIAL_REGION = {
  latitude: 35.6895,
  longitude: 139.7005,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

export default function MapScreen() {
  const [maxPrice, setMaxPrice] = useState(800);
  const [activeCategories, setActiveCategories] = useState<Set<CategoryId>>(
    new Set(CATEGORIES.map((c) => c.id)),
  );
  const [userSpots, setUserSpots] = useState<Spot[]>([]);
  const [votes, setVotes] = useState<VoteMap>({});
  const [selected, setSelected] = useState<Spot | null>(null);
  const [pendingCoord, setPendingCoord] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    getJSON<Spot[]>(KEYS.userSpots, []).then(setUserSpots);
    getJSON<VoteMap>(KEYS.votes, {}).then(setVotes);
    void Location.requestForegroundPermissionsAsync();
  }, []);

  const spots = useMemo(() => SAMPLE_SPOTS.concat(userSpots), [userSpots]);

  const visibleSpots = useMemo(
    () =>
      spots.filter(
        (s) => (s.price === 0 || s.price <= maxPrice) && activeCategories.has(s.category),
      ),
    [spots, maxPrice, activeCategories],
  );

  function toggleCategory(id: CategoryId) {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function vote(spot: Spot, dir: "up" | "down") {
    setVotes((prev) => {
      const next: VoteMap = { ...prev };
      if (next[spot.id] === dir) delete next[spot.id];
      else next[spot.id] = dir;
      void setJSON(KEYS.votes, next);
      return next;
    });
  }

  function handleLongPress(e: LongPressEvent) {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setSelected(null);
    setPendingCoord({ lat: latitude, lng: longitude });
  }

  async function addSpot(spot: Spot) {
    const next = [...userSpots, spot];
    setUserSpots(next);
    await setJSON(KEYS.userSpots, next);
    setPendingCoord(null);
  }

  const myVote = selected ? votes[selected.id] : undefined;

  return (
    <View style={styles.container}>
      <MapView
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_GOOGLE}
        initialRegion={INITIAL_REGION}
        showsUserLocation
        onLongPress={handleLongPress}
        onPress={() => setSelected(null)}
      >
        {visibleSpots.map((spot) => (
          <Marker
            key={spot.id}
            coordinate={{ latitude: spot.lat, longitude: spot.lng }}
            tracksViewChanges={false}
            onPress={(e) => {
              e.stopPropagation();
              setSelected(spot);
            }}
          >
            <SpotIcon spot={spot} />
          </Marker>
        ))}
      </MapView>

      {/* フィルタ(上部チップ) */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
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

      <View style={styles.hintBadge}>
        <Text style={styles.hintText}>長押しでお店を投稿 ・ 表示中 {visibleSpots.length}件</Text>
      </View>

      {/* スポット詳細カード */}
      {selected && (
        <View style={styles.detailCard}>
          <Text style={styles.detailName}>{selected.name}</Text>
          <Text style={styles.detailMeta}>
            {categoryOf(selected.category)?.emoji} {categoryOf(selected.category)?.label} ・{" "}
            <Text style={{ color: colors.primary, fontWeight: "700" }}>
              {selected.price === 0 ? "無料" : `${selected.price}円`}
            </Text>
          </Text>
          {selected.comment ? <Text style={styles.detailComment}>{selected.comment}</Text> : null}
          <View style={styles.voteRow}>
            <VoteButton
              label={`👍 コスパ良い ${selected.up + (myVote === "up" ? 1 : 0)}`}
              active={myVote === "up"}
              onPress={() => vote(selected, "up")}
            />
            <VoteButton
              label={`👎 微妙 ${selected.down + (myVote === "down" ? 1 : 0)}`}
              active={myVote === "down"}
              onPress={() => vote(selected, "down")}
            />
          </View>
        </View>
      )}

      <AddSpotModal coord={pendingCoord} onClose={() => setPendingCoord(null)} onSubmit={addSpot} />
    </View>
  );
}

function SpotIcon({ spot }: { spot: Spot }) {
  const cat = categoryOf(spot.category);
  return (
    <View style={styles.markerWrap}>
      <View style={[styles.markerBubble, { borderColor: priceColor(spot.price) }]}>
        <Text style={styles.markerEmoji}>{cat?.emoji ?? "📍"}</Text>
      </View>
      <View style={[styles.markerPrice, { backgroundColor: priceColor(spot.price) }]}>
        <Text style={styles.markerPriceText}>{spot.price === 0 ? "無料" : `¥${spot.price}`}</Text>
      </View>
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

function VoteButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.voteBtn, active && styles.voteBtnActive]}>
      <Text style={styles.voteBtnText}>{label}</Text>
    </Pressable>
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
  const [price, setPrice] = useState("");
  const [comment, setComment] = useState("");
  const [category, setCategory] = useState<CategoryId>("teishoku");

  useEffect(() => {
    if (coord) {
      setName("");
      setPrice("");
      setComment("");
      setCategory("teishoku");
    }
  }, [coord]);

  function submit() {
    const priceNum = Number(price);
    if (!name.trim()) {
      Alert.alert("店名を入力してください");
      return;
    }
    if (!Number.isFinite(priceNum) || priceNum < 0 || price.trim() === "") {
      Alert.alert("価格を数字で入力してください(無料なら0)");
      return;
    }
    if (priceNum > 1000) {
      Alert.alert("1000円以下のスポットのみ投稿できます");
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
      comment: comment.trim(),
      up: 0,
      down: 0,
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
              <Chip
                key={c.id}
                label={`${c.emoji} ${c.label}`}
                active={category === c.id}
                onPress={() => setCategory(c.id)}
              />
            ))}
          </ScrollView>
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
            placeholder="ひとことコメント(任意)"
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
            <Pressable onPress={submit} style={styles.btnPrimary}>
              <Text style={styles.btnPrimaryText}>投稿する</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  filterBar: { position: "absolute", top: 8, left: 0, right: 0 },
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
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, color: colors.text },
  chipTextActive: { color: "#fff", fontWeight: "700" },
  hintBadge: {
    position: "absolute",
    top: 52,
    alignSelf: "center",
    backgroundColor: "rgba(38,37,31,0.75)",
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  hintText: { color: "#fff", fontSize: 11 },
  markerWrap: { alignItems: "center" },
  markerBubble: {
    backgroundColor: colors.surface,
    borderRadius: 999,
    borderWidth: 2,
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  markerEmoji: { fontSize: 18 },
  markerPrice: { borderRadius: 6, paddingHorizontal: 4, paddingVertical: 1, marginTop: 2 },
  markerPriceText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  detailCard: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 16,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  detailName: { fontSize: 16, fontWeight: "700", color: colors.text },
  detailMeta: { fontSize: 13, color: colors.textSub, marginTop: 2 },
  detailComment: { fontSize: 13, color: colors.text, marginTop: 6 },
  voteRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  voteBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
    backgroundColor: colors.surface,
  },
  voteBtnActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  voteBtnText: { fontSize: 13, color: colors.text },
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
  },
  modalTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 12 },
  modalChips: { marginBottom: 10, flexGrow: 0 },
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
  btnPrimary: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  btnPrimaryText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});
