/* ポイント(チリツモ)計算ロジック。
 * 「塵も積もれば山となる」から命名。歩数をポイントに変換する。
 * 純粋関数として分離し、UIなしでテストできるようにしている。
 */

export const STEPS_PER_CHUNK = 1000; // 1000歩ごとに
export const POINTS_PER_CHUNK = 10; // 10チリツモ
export const DAILY_STEP_CAP = 10000; // 1日1万歩まで換算対象
export const LOGIN_BONUS = 5; // 1日1回の起動ボーナス
export const QUIZ_REWARD = 5; // 節約ガイドのクイズ正解(記事ごとに1回)

/** 今日の歩数と受取済みチャンク数から、いま受け取れるチャンク数を返す */
export function claimableChunks(todaySteps: number, claimedChunks: number): number {
  const cappedSteps = Math.min(Math.max(todaySteps, 0), DAILY_STEP_CAP);
  const totalChunks = Math.floor(cappedSteps / STEPS_PER_CHUNK);
  return Math.max(totalChunks - claimedChunks, 0);
}

/** チャンク数をポイントに換算 */
export function chunksToPoints(chunks: number): number {
  return chunks * POINTS_PER_CHUNK;
}

/** 次のチャンクまであと何歩か(上限到達後は0) */
export function stepsToNextChunk(todaySteps: number): number {
  const capped = Math.min(Math.max(todaySteps, 0), DAILY_STEP_CAP);
  if (capped >= DAILY_STEP_CAP) return 0;
  return STEPS_PER_CHUNK - (capped % STEPS_PER_CHUNK);
}

/** ローカル日付キー(端末タイムゾーン基準) YYYY-MM-DD */
export function dateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** その日の0時 */
export function startOfDay(d: Date = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
