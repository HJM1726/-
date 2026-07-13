/* Supabaseクライアント。
 * 環境変数(EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY)が
 * 設定されていればサーバーモード、なければ null を返してローカルモードで動く。
 * 設定方法は mobile/README.md の「サーバー連동」参照。
 */
import "react-native-url-polyfill/auto";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Metroがビルド時に EXPO_PUBLIC_* をインライン化する
declare const process: { env: Record<string, string | undefined> };

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!url || !anonKey) return null;
  if (!client) {
    client = createClient(url, anonKey, {
      auth: {
        // Webはデフォルト(localStorage)、ネイティブはAsyncStorage
        ...(Platform.OS === "web" ? {} : { storage: AsyncStorage }),
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}

/** 会員登録なしで使わせるため匿名セッションを保証する。
 *  Supabase側で Anonymous Sign-Ins を有効にしておくこと。 */
export async function ensureAnonSession(sb: SupabaseClient): Promise<void> {
  const { data } = await sb.auth.getSession();
  if (!data.session) {
    await sb.auth.signInAnonymously();
  }
}
