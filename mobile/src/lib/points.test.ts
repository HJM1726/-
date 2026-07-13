// node --experimental-strip-types --test で実行(npm test)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CHEST_MAX,
  CHEST_MIN,
  FINAL_MILESTONE_STEPS,
  LOGIN_BONUS,
  MAX_DAILY_STEP_POINTS,
  QUIZ_REWARD,
  ROULETTE_PRIZES,
  STEP_MILESTONES,
  claimableMilestones,
  dateKey,
  nextMilestone,
  reachedMilestones,
  rollChest,
  rollRoulette,
} from "./points.ts";

test("区間は昇順に定義されている", () => {
  for (let i = 1; i < STEP_MILESTONES.length; i++) {
    assert.ok(STEP_MILESTONES[i].steps > STEP_MILESTONES[i - 1].steps);
  }
});

test("到達区間の判定", () => {
  assert.equal(reachedMilestones(0).length, 0);
  assert.equal(reachedMilestones(1999).length, 0);
  assert.equal(reachedMilestones(2000).length, 1);
  assert.equal(reachedMilestones(5000).length, 2);
  assert.equal(reachedMilestones(13152).length, 4);
});

test("受取済みの区間は除外される", () => {
  assert.equal(claimableMilestones(5000, [2000]).length, 1);
  assert.equal(claimableMilestones(5000, [2000, 5000]).length, 0);
  assert.equal(claimableMilestones(10000, []).length, 4);
});

test("1日の最大歩数ポイント", () => {
  const total = claimableMilestones(FINAL_MILESTONE_STEPS, []).reduce((s, m) => s + m.pt, 0);
  assert.equal(total, MAX_DAILY_STEP_POINTS);
});

test("次の区間", () => {
  assert.equal(nextMilestone(0)?.steps, 2000);
  assert.equal(nextMilestone(2000)?.steps, 5000);
  assert.equal(nextMilestone(10000), undefined);
});

test("ルーレットは定義済み賞金のどれかを返す", () => {
  assert.equal(rollRoulette(() => 0), ROULETTE_PRIZES[0]);
  assert.equal(rollRoulette(() => 0.999999), ROULETTE_PRIZES[ROULETTE_PRIZES.length - 1]);
  for (let i = 0; i < 20; i++) {
    assert.ok(ROULETTE_PRIZES.includes(rollRoulette()));
  }
});

test("宝箱は範囲内を返す", () => {
  assert.equal(rollChest(() => 0), CHEST_MIN);
  assert.equal(rollChest(() => 0.999999), CHEST_MAX);
  for (let i = 0; i < 20; i++) {
    const v = rollChest();
    assert.ok(v >= CHEST_MIN && v <= CHEST_MAX);
  }
});

test("日付キーの形式", () => {
  assert.match(dateKey(new Date(2026, 6, 12)), /^2026-07-12$/);
});

test("ボーナス定数は正の値", () => {
  assert.ok(LOGIN_BONUS > 0);
  assert.ok(QUIZ_REWARD > 0);
});
