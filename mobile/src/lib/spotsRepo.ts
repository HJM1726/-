/* スポットのデータアクセス層。
 * サーバーモード(Supabase設定あり): 承認済みスポットを spots_public ビューから取得し、
 *   投稿は status=pending でINSERT(管理者の承認後に地図へ載る)。
 * ローカルモード(設定なし): サンプル + AsyncStorage(いままで通り)。
 * 画面側はこのモジュールだけを見ればよく、バックエンドの有無を意識しない。
 */
import { SAMPLE_SPOTS } from "../data/spots";
import { CategoryId, Spot } from "../types";
import { getJSON, setJSON, KEYS } from "./storage";
import { ensureAnonSession, getSupabase } from "./supabase";

export interface SubmitResult {
  pendingApproval: boolean;
}

export function isServerMode(): boolean {
  return getSupabase() != null;
}

export async function fetchSpots(): Promise<Spot[]> {
  const sb = getSupabase();
  if (!sb) {
    const userSpots = await getJSON<Spot[]>(KEYS.userSpots, []);
    return SAMPLE_SPOTS.concat(userSpots);
  }
  const { data, error } = await sb
    .from("spots_public")
    .select("id,name,category,price,lat,lng,menu,hours,comment,created_at,up,down,rating,rating_count");
  if (error || !data) return SAMPLE_SPOTS; // サーバー障害時はサンプルで縮退
  return data.map(rowToSpot);
}

export async function submitSpot(spot: Spot): Promise<SubmitResult> {
  const sb = getSupabase();
  if (!sb) {
    const userSpots = await getJSON<Spot[]>(KEYS.userSpots, []);
    await setJSON(KEYS.userSpots, [...userSpots, spot]);
    return { pendingApproval: false };
  }
  await ensureAnonSession(sb);
  const { data: userData } = await sb.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("認証に失敗しました");
  const { error } = await sb.from("spots").insert({
    name: spot.name,
    category: spot.category,
    price: spot.price,
    lat: spot.lat,
    lng: spot.lng,
    menu: spot.menu ?? null,
    hours: spot.hours ?? null,
    comment: spot.comment ?? null,
    created_by: userId,
  });
  if (error) throw new Error(error.message);
  return { pendingApproval: true };
}

interface SpotRow {
  id: string;
  name: string;
  category: string;
  price: number;
  lat: number;
  lng: number;
  menu: string | null;
  hours: string | null;
  comment: string | null;
  created_at: string;
  up: number;
  down: number;
  rating: number | null;
  rating_count: number;
}

function rowToSpot(row: SpotRow): Spot {
  return {
    id: row.id,
    name: row.name,
    category: row.category as CategoryId,
    price: row.price,
    lat: row.lat,
    lng: row.lng,
    menu: row.menu ?? undefined,
    hours: row.hours ?? undefined,
    comment: row.comment ?? undefined,
    up: row.up,
    down: row.down,
    rating: row.rating ?? undefined,
    ratingCount: row.rating_count,
    createdAt: new Date(row.created_at).getTime(),
  };
}
