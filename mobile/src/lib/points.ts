/* ポイント(チリツモ)計算ロジック。
 * 「塵も積もれば山となる」から命名。歩数や日次アクションをポイントに変換する。
 * 純粋関数として分離し、UIなしでテストできるようにしている。
 */

/* ---- 歩数の区間報酬(참고앱の「구간보상」方式) ---- */

export interface StepMilestone {
  steps: number;
  pt: number;
}

export const STEP_MILESTONES: StepMilestone[] = [
  { steps: 2000, pt: 30 },
  { steps: 5000, pt: 30 },
  { steps: 8000, pt: 30 },
  { steps: 10000, pt: 30 },
];

export const MAX_DAILY_STEP_POINTS = STEP_MILESTONES.reduce((sum, m) => sum + m.pt, 0);
export const FINAL_MILESTONE_STEPS = STEP_MILESTONES[STEP_MILESTONES.length - 1].steps;

/** 今日の歩数で到達済みの区間 */
export function reachedMilestones(steps: number): StepMilestone[] {
  return STEP_MILESTONES.filter((m) => steps >= m.steps);
}

/** 到達済みかつ未受取の区間 */
export function claimableMilestones(steps: number, claimedSteps: number[]): StepMilestone[] {
  return reachedMilestones(steps).filter((m) => !claimedSteps.includes(m.steps));
}

/** 次の区間(全区間到達済みなら undefined) */
export function nextMilestone(steps: number): StepMilestone | undefined {
  return STEP_MILESTONES.find((m) => steps < m.steps);
}

/* ---- 日次リワード ---- */

export const LOGIN_BONUS = 5; // 出席(1日1回)
export const QUIZ_REWARD = 5; // 節約ガイドのクイズ正解(記事ごとに1回)
export const ROULETTE_PRIZES = [5, 10, 15, 20, 30, 50]; // ルーレット(1日1回)
export const CHEST_MIN = 1; // 宝箱(1日1回)
export const CHEST_MAX = 10;

export function rollRoulette(rand: () => number = Math.random): number {
  const idx = Math.min(Math.floor(rand() * ROULETTE_PRIZES.length), ROULETTE_PRIZES.length - 1);
  return ROULETTE_PRIZES[idx];
}

export function rollChest(rand: () => number = Math.random): number {
  return CHEST_MIN + Math.min(Math.floor(rand() * (CHEST_MAX - CHEST_MIN + 1)), CHEST_MAX - CHEST_MIN);
}

/* ---- 日付ユーティリティ ---- */

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
