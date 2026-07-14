import React, { useState } from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useAccount } from "../context/AccountContext";
import { colors } from "../theme";

/* ポイント受け取り前のログイン(ニックネーム登録)モーダル。
 * 참고앱과 같은 원칙: 閲覧は匿名OK・報酬はアカウント必須(多重アカウント抑止)。 */
export default function LoginModal({
  visible,
  onClose,
  onDone,
}: {
  visible: boolean;
  onClose: () => void;
  onDone?: () => void;
}) {
  const { login } = useAccount();
  const [nickname, setNickname] = useState("");

  async function submit() {
    const name = nickname.trim();
    if (name.length < 2 || name.length > 12) {
      const msg = "ニックネームは2〜12文字で入力してください";
      if (Platform.OS === "web") window.alert(msg);
      return;
    }
    await login(name);
    setNickname("");
    onClose();
    onDone?.();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>🔒 ログイン(無料)</Text>
          <Text style={styles.desc}>
            マップの閲覧・投稿はログイン不要ですが、ポイントの受け取り・使用にはニックネーム登録が必要です(不正防止のため)。
          </Text>
          <TextInput
            style={styles.input}
            placeholder="ニックネーム(2〜12文字)"
            placeholderTextColor={colors.textSub}
            value={nickname}
            onChangeText={setNickname}
            maxLength={12}
          />
          <Text style={styles.note}>
            ※ MVP版はこの端末に登録されます。機種変更に備えたLINE/Appleログインはサーバー対応後に追加予定。
          </Text>
          <Pressable onPress={submit} style={styles.btnDark}>
            <Text style={styles.btnDarkText}>登録してはじめる</Text>
          </Pressable>
          <Pressable onPress={onClose} style={styles.btnGhost}>
            <Text style={styles.btnGhostText}>あとで</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modal: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
    ...(Platform.OS === "web" ? { maxWidth: 480, width: "100%", alignSelf: "center" as const } : null),
  },
  title: { fontSize: 17, fontWeight: "800", color: colors.text },
  desc: { fontSize: 13, color: colors.text, lineHeight: 19, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: colors.text,
    marginTop: 12,
  },
  note: { fontSize: 11, color: colors.textSub, lineHeight: 16, marginTop: 8 },
  btnDark: {
    backgroundColor: colors.dark,
    borderRadius: 999,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 14,
  },
  btnDarkText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  btnGhost: { alignItems: "center", paddingVertical: 12 },
  btnGhostText: { color: colors.textSub, fontSize: 13 },
});
