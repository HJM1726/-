/* 投票・星評価・コメント・通報のデータアクセス層。
 * 画面側はローカル状態を楽観的に更新し(今まで通り即時反映)、
 * サーバーモードなら裏でSupabaseへwrite-throughする。失敗しても画面は壊さない
 * (ローカルが真実のMVP → サーバーが真実に段階移行するための中間形)。 */
import { VoteDir } from "../types";
import { ensureAnonSession, getSupabase } from "./supabase";

async function withUser<T>(
  fn: (sb: NonNullable<ReturnType<typeof getSupabase>>, userId: string) => Promise<T>,
): Promise<T | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    await ensureAnonSession(sb);
    const { data } = await sb.auth.getUser();
    const userId = data.user?.id;
    if (!userId) return null;
    return await fn(sb, userId);
  } catch {
    return null; // サーバー失敗は黙ってローカル動作を継続
  }
}

/** 投票を同期。dir=null は取り消し */
export async function syncVote(spotId: string, dir: VoteDir | null): Promise<void> {
  await withUser(async (sb, userId) => {
    if (dir == null) {
      await sb.from("spot_votes").delete().eq("spot_id", spotId).eq("user_id", userId);
    } else {
      await sb.from("spot_votes").upsert({ spot_id: spotId, user_id: userId, dir });
    }
  });
}

/** 星評価を同期。stars=null は取り消し */
export async function syncRating(spotId: string, stars: number | null): Promise<void> {
  await withUser(async (sb, userId) => {
    if (stars == null) {
      await sb.from("spot_ratings").delete().eq("spot_id", spotId).eq("user_id", userId);
    } else {
      await sb.from("spot_ratings").upsert({ spot_id: spotId, user_id: userId, stars });
    }
  });
}

/** コメントを同期(挿入のみ) */
export async function syncComment(spotId: string, body: string): Promise<void> {
  await withUser(async (sb, userId) => {
    await sb.from("spot_comments").insert({ spot_id: spotId, user_id: userId, body });
  });
}

/** スポット/コメントの通報。ローカルモードでは何もしない(UI側で受付表示のみ) */
export async function reportContent(
  targetType: "spot" | "comment",
  targetId: string,
  reason: string,
): Promise<void> {
  await withUser(async (sb, userId) => {
    await sb.from("reports").insert({
      target_type: targetType,
      target_id: targetId,
      reason,
      created_by: userId,
    });
  });
}
