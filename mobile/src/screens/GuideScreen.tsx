import React, { useEffect, useMemo, useState } from "react";
import {
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
import { GUIDE_CATEGORIES, GUIDES, Guide, GuideCategoryId, guideCategoryOf } from "../data/guides";
import { QUIZ_REWARD } from "../lib/points";
import { getJSON, setJSON, KEYS } from "../lib/storage";
import { colors } from "../theme";

export default function GuideScreen() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<GuideCategoryId | null>(null);
  const [openGuide, setOpenGuide] = useState<Guide | null>(null);
  const [quizDone, setQuizDone] = useState<Record<string, boolean>>({});
  const [readIds, setReadIds] = useState<string[]>([]);

  useEffect(() => {
    getJSON<Record<string, boolean>>(KEYS.guideQuiz, {}).then(setQuizDone);
    getJSON<string[]>(KEYS.guideRead, []).then(setReadIds);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return GUIDES.filter((g) => {
      if (category && g.category !== category) return false;
      if (!q) return true;
      const haystack = [g.title, g.summary, ...g.body, ...g.tags].join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [query, category]);

  function open(guide: Guide) {
    setOpenGuide(guide);
    if (!readIds.includes(guide.id)) {
      const next = [...readIds, guide.id];
      setReadIds(next);
      void setJSON(KEYS.guideRead, next);
    }
  }

  function markQuizDone(id: string) {
    setQuizDone((prev) => {
      const next = { ...prev, [id]: true };
      void setJSON(KEYS.guideQuiz, next);
      return next;
    });
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>節約ガイド</Text>
        <Text style={styles.subheading}>
          税金・光熱費・通信費…知らないと損する固定費のキホン。クイズに正解で+{QUIZ_REWARD}pt
        </Text>

        {/* 検索 */}
        <TextInput
          style={styles.search}
          placeholder="🔍 検索(例:電気、年金、家賃)"
          placeholderTextColor={colors.textSub}
          value={query}
          onChangeText={setQuery}
        />

        {/* カテゴリチップ */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroll}
          contentContainerStyle={styles.chipRow}
        >
          <Chip label="すべて" active={category === null} onPress={() => setCategory(null)} />
          {GUIDE_CATEGORIES.map((c) => (
            <Chip
              key={c.id}
              label={`${c.emoji} ${c.label}`}
              active={category === c.id}
              onPress={() => setCategory(category === c.id ? null : c.id)}
            />
          ))}
        </ScrollView>

        {/* 記事リスト */}
        {results.length === 0 && (
          <Text style={styles.empty}>該当するガイドがありません。キーワードを変えてみてください</Text>
        )}
        {results.map((g) => {
          const cat = guideCategoryOf(g.category);
          return (
            <Pressable key={g.id} style={styles.card} onPress={() => open(g)}>
              <View style={styles.cardHeader}>
                <View style={styles.catTag}>
                  <Text style={styles.catTagText}>
                    {cat?.emoji} {cat?.label}
                  </Text>
                </View>
                {quizDone[g.id] ? (
                  <Text style={styles.doneBadge}>✅ クイズ済</Text>
                ) : (
                  <View style={styles.ptBadge}>
                    <Text style={styles.ptBadgeText}>✨ +{QUIZ_REWARD}pt</Text>
                  </View>
                )}
              </View>
              <Text style={styles.cardTitle}>{g.title}</Text>
              <Text style={styles.cardSummary} numberOfLines={2}>
                {g.summary}
              </Text>
              {readIds.includes(g.id) && !quizDone[g.id] && (
                <Text style={styles.readMark}>📖 読了・クイズに挑戦しよう</Text>
              )}
            </Pressable>
          );
        })}

        <Text style={styles.disclaimer}>
          ※ 各記事は入門向けの一般情報です。制度・金額は改正されるため、必ず公式サイト(国税庁・日本年金機構・JASSOなど)で最新情報を確認してください。
        </Text>
      </ScrollView>

      {openGuide && (
        <GuideDetailModal
          guide={openGuide}
          quizDone={!!quizDone[openGuide.id]}
          onQuizDone={() => markQuizDone(openGuide.id)}
          onClose={() => setOpenGuide(null)}
        />
      )}
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

function GuideDetailModal({
  guide,
  quizDone,
  onQuizDone,
  onClose,
}: {
  guide: Guide;
  quizDone: boolean;
  onQuizDone: () => void;
  onClose: () => void;
}) {
  const { addPoints } = usePoints();
  const [picked, setPicked] = useState<number | null>(null);
  const [awarded, setAwarded] = useState(false);
  const cat = guideCategoryOf(guide.category);
  const correct = picked === guide.quiz.answerIdx;

  function pick(idx: number) {
    if (picked !== null || quizDone) return;
    setPicked(idx);
    if (idx === guide.quiz.answerIdx) {
      onQuizDone();
      void addPoints(QUIZ_REWARD);
      setAwarded(true);
    }
  }

  function retry() {
    setPicked(null);
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modal}>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <View style={styles.cardHeader}>
              <View style={styles.catTag}>
                <Text style={styles.catTagText}>
                  {cat?.emoji} {cat?.label}
                </Text>
              </View>
              <Pressable onPress={onClose} hitSlop={8}>
                <Text style={styles.closeX}>✕</Text>
              </Pressable>
            </View>
            <Text style={styles.detailTitle}>{guide.title}</Text>
            {guide.body.map((p, i) => (
              <Text key={i} style={styles.paragraph}>
                {p}
              </Text>
            ))}

            {/* クイズ */}
            <View style={styles.quizCard}>
              <Text style={styles.quizLabel}>
                🧠 理解度クイズ {quizDone ? "(回答済み)" : `(正解で+${QUIZ_REWARD}pt)`}
              </Text>
              <Text style={styles.quizQuestion}>{guide.quiz.question}</Text>
              {guide.quiz.choices.map((choice, idx) => {
                const isAnswer = idx === guide.quiz.answerIdx;
                const isPicked = picked === idx;
                const revealed = picked !== null || quizDone;
                return (
                  <Pressable
                    key={idx}
                    onPress={() => pick(idx)}
                    style={[
                      styles.choice,
                      revealed && isAnswer && styles.choiceCorrect,
                      revealed && isPicked && !isAnswer && styles.choiceWrong,
                    ]}
                  >
                    <Text style={styles.choiceText}>
                      {revealed && isAnswer ? "⭕️ " : revealed && isPicked ? "❌ " : ""}
                      {choice}
                    </Text>
                  </Pressable>
                );
              })}
              {(picked !== null || quizDone) && (
                <Text style={styles.quizExplanation}>{guide.quiz.explanation}</Text>
              )}
              {awarded && <Text style={styles.awardText}>✨ +{QUIZ_REWARD}pt ゲット!</Text>}
              {picked !== null && !correct && !quizDone && (
                <Pressable onPress={retry} style={styles.retryBtn}>
                  <Text style={styles.retryBtnText}>もう一度挑戦</Text>
                </Pressable>
              )}
            </View>

            <Pressable onPress={onClose} style={styles.btnDark}>
              <Text style={styles.btnDarkText}>閉じる</Text>
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
  heading: { fontSize: 20, fontWeight: "800", color: colors.text },
  subheading: { fontSize: 12, color: colors.textSub, marginTop: 4, marginBottom: 12 },
  search: {
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 16,
    fontSize: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipScroll: { marginTop: 10, marginBottom: 4, flexGrow: 0 },
  chipRow: { gap: 6, alignItems: "center" },
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
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginTop: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  catTag: {
    backgroundColor: colors.bg,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  catTagText: { fontSize: 11, color: colors.text, fontWeight: "600" },
  ptBadge: {
    backgroundColor: colors.dark,
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  ptBadgeText: { fontSize: 10, fontWeight: "800", color: colors.gold },
  doneBadge: { fontSize: 11, color: colors.textSub },
  cardTitle: { fontSize: 15, fontWeight: "800", color: colors.text },
  cardSummary: { fontSize: 12, color: colors.textSub, marginTop: 4, lineHeight: 17 },
  readMark: { fontSize: 11, color: colors.primary, marginTop: 6, fontWeight: "600" },
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
    maxHeight: "88%",
    ...(Platform.OS === "web" ? { maxWidth: 520, width: "100%", alignSelf: "center" as const } : null),
  },
  modalContent: { padding: 20, paddingBottom: 34 },
  closeX: { fontSize: 18, color: colors.textSub, padding: 4 },
  detailTitle: { fontSize: 18, fontWeight: "800", color: colors.text, marginBottom: 10 },
  paragraph: { fontSize: 14, color: colors.text, lineHeight: 22, marginBottom: 10 },
  quizCard: {
    backgroundColor: colors.bg,
    borderRadius: 16,
    padding: 14,
    marginTop: 6,
  },
  quizLabel: { fontSize: 12, fontWeight: "800", color: colors.text },
  quizQuestion: { fontSize: 14, fontWeight: "700", color: colors.text, marginTop: 8, marginBottom: 10 },
  choice: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  choiceCorrect: { borderColor: colors.free, backgroundColor: "#e9f5ee" },
  choiceWrong: { borderColor: colors.newBadge, backgroundColor: "#fdeaea" },
  choiceText: { fontSize: 13, color: colors.text },
  quizExplanation: { fontSize: 12, color: colors.textSub, lineHeight: 18, marginTop: 4 },
  awardText: { fontSize: 14, fontWeight: "800", color: colors.primary, marginTop: 8 },
  retryBtn: { alignSelf: "flex-start", marginTop: 8 },
  retryBtnText: { fontSize: 13, color: colors.point, fontWeight: "700" },
  btnDark: {
    backgroundColor: colors.dark,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 16,
  },
  btnDarkText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});
