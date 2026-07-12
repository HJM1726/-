import React, { useState } from "react";
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { categoryOf } from "../data/spots";
import { colors } from "../theme";
import { Spot, SpotComment, VoteDir } from "../types";

interface Props {
  spot: Spot;
  myVote?: VoteDir;
  onVote: (dir: VoteDir) => void;
  myRating?: number;
  onRate: (stars: number) => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  comments: SpotComment[];
  onAddComment: (text: string) => void;
  onClose: () => void;
}

export default function SpotDetailSheet({
  spot,
  myVote,
  onVote,
  myRating,
  onRate,
  isFavorite,
  onToggleFavorite,
  comments,
  onAddComment,
  onClose,
}: Props) {
  const [draft, setDraft] = useState("");
  const cat = categoryOf(spot.category);

  // サンプルの初期評価に自分の星を合成した平均
  const baseCount = spot.ratingCount ?? 0;
  const baseSum = (spot.rating ?? 0) * baseCount;
  const count = baseCount + (myRating ? 1 : 0);
  const avg = count > 0 ? (baseSum + (myRating ?? 0)) / count : 0;

  function openExternalMap() {
    const url = `https://www.google.com/maps/search/?api=1&query=${spot.lat},${spot.lng}`;
    void Linking.openURL(url);
  }

  function submitComment() {
    const text = draft.trim();
    if (!text) return;
    onAddComment(text);
    setDraft("");
  }

  return (
    <View style={styles.sheet}>
      <Pressable onPress={onClose} style={styles.handleArea}>
        <View style={styles.handle} />
      </Pressable>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* 店名 + お気に入り */}
        <View style={styles.titleRow}>
          <Text style={styles.name} numberOfLines={2}>
            {spot.name}
          </Text>
          <Pressable onPress={onToggleFavorite} style={styles.favBtn} hitSlop={8}>
            <Text style={styles.favIcon}>{isFavorite ? "❤️" : "🤍"}</Text>
          </Pressable>
        </View>

        {/* カテゴリタグ + 価格 */}
        <View style={styles.priceRow}>
          <View style={styles.catTag}>
            <Text style={styles.catTagText}>
              {cat?.emoji} {cat?.label}
            </Text>
          </View>
          <Text style={styles.price}>{spot.price === 0 ? "無料" : `${spot.price}円`}</Text>
        </View>

        {/* 詳細フィールド */}
        <View style={styles.fields}>
          {spot.menu ? <Field label="メニュー" value={spot.menu} /> : null}
          {spot.hours ? <Field label="営業時間" value={spot.hours} /> : null}
          {spot.comment ? <Field label="メモ" value={spot.comment} /> : null}
          {spot.createdAt ? (
            <Field label="投稿日" value={new Date(spot.createdAt).toLocaleDateString("ja-JP")} />
          ) : null}
        </View>

        <Pressable onPress={openExternalMap} style={styles.mapBtn}>
          <Text style={styles.mapBtnText}>🗺 Googleマップで見る</Text>
        </Pressable>

        {/* コスパ投票 */}
        <View style={styles.voteRow}>
          <VoteButton
            label={`👍 コスパ良い ${spot.up + (myVote === "up" ? 1 : 0)}`}
            active={myVote === "up"}
            onPress={() => onVote("up")}
          />
          <VoteButton
            label={`👎 微妙 ${spot.down + (myVote === "down" ? 1 : 0)}`}
            active={myVote === "down"}
            onPress={() => onVote("down")}
          />
        </View>

        {/* 星評価 */}
        <View style={styles.ratingCard}>
          <Text style={styles.sectionLabel}>評価</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable key={n} onPress={() => onRate(n)} hitSlop={4}>
                <Text style={[styles.star, (myRating ?? 0) >= n && styles.starMine]}>
                  {avg >= n - 0.25 ? "★" : "☆"}
                </Text>
              </Pressable>
            ))}
            <Text style={styles.ratingMeta}>
              {count > 0 ? `${avg.toFixed(1)}点・${count}件` : "評価なし"}
            </Text>
          </View>
          <Text style={styles.ratingHint}>タップして評価{myRating ? `(あなた:${myRating}★)` : ""}</Text>
        </View>

        {/* コメント */}
        <View style={styles.commentsCard}>
          <Text style={styles.sectionLabel}>コメント {comments.length}</Text>
          {comments.length === 0 && (
            <Text style={styles.commentEmpty}>まだコメントがありません。最初のひとことをどうぞ</Text>
          )}
          {comments.map((c) => (
            <View key={c.id} style={styles.commentItem}>
              <Text style={styles.commentAuthor}>
                匿名 <Text style={styles.commentDate}>{relativeTime(c.at)}</Text>
              </Text>
              <Text style={styles.commentText}>{c.text}</Text>
            </View>
          ))}
          <View style={styles.commentInputRow}>
            <TextInput
              style={styles.commentInput}
              placeholder="コメント"
              placeholderTextColor={colors.textSub}
              value={draft}
              onChangeText={setDraft}
              maxLength={120}
            />
            <Pressable onPress={submitComment} style={styles.sendBtn}>
              <Text style={styles.sendBtnText}>➤</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );
}

function VoteButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.voteBtn, active && styles.voteBtnActive]}>
      <Text style={styles.voteBtnText}>{label}</Text>
    </Pressable>
  );
}

function relativeTime(at: number): string {
  const diff = Date.now() - at;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "たった今";
  if (min < 60) return `${min}分前`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours}時間前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}日前`;
  return new Date(at).toLocaleDateString("ja-JP");
}

const styles = StyleSheet.create({
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: "62%",
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 10,
    zIndex: 1500,
  },
  handleArea: { alignItems: "center", paddingVertical: 8 },
  handle: { width: 44, height: 4, borderRadius: 999, backgroundColor: colors.border },
  scroll: { flexGrow: 0 },
  scrollContent: { paddingHorizontal: 18, paddingBottom: 24 },
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  name: { flex: 1, fontSize: 18, fontWeight: "800", color: colors.text },
  favBtn: { padding: 2 },
  favIcon: { fontSize: 20 },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  catTag: {
    backgroundColor: colors.bg,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  catTagText: { fontSize: 12, color: colors.text, fontWeight: "600" },
  price: { fontSize: 26, fontWeight: "800", color: colors.text },
  fields: { marginTop: 12, gap: 8 },
  fieldRow: { flexDirection: "row", gap: 12 },
  fieldLabel: { width: 64, fontSize: 13, color: colors.textSub },
  fieldValue: { flex: 1, fontSize: 13, color: colors.text },
  mapBtn: {
    marginTop: 14,
    backgroundColor: colors.dark,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  mapBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  voteRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  voteBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: colors.surface,
  },
  voteBtnActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  voteBtnText: { fontSize: 13, color: colors.text },
  ratingCard: {
    marginTop: 14,
    backgroundColor: colors.bg,
    borderRadius: 12,
    padding: 12,
  },
  sectionLabel: { fontSize: 12, fontWeight: "800", color: colors.text, marginBottom: 6 },
  starsRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  star: { fontSize: 24, color: colors.star },
  starMine: { textShadowColor: colors.primary, textShadowRadius: 4 },
  ratingMeta: { marginLeft: 10, fontSize: 13, color: colors.textSub },
  ratingHint: { fontSize: 10, color: colors.textSub, marginTop: 4 },
  commentsCard: { marginTop: 14 },
  commentEmpty: { fontSize: 12, color: colors.textSub, marginVertical: 8 },
  commentItem: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: 10,
  },
  commentAuthor: { fontSize: 12, fontWeight: "700", color: colors.text },
  commentDate: { fontWeight: "400", color: colors.textSub },
  commentText: { fontSize: 13, color: colors.text, marginTop: 4 },
  commentInputRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    fontSize: 13,
    color: colors.text,
  },
  sendBtn: {
    backgroundColor: colors.dark,
    borderRadius: 999,
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnText: { color: "#fff", fontSize: 15 },
});
