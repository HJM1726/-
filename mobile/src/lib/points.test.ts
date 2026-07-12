// node --experimental-strip-types --test で実行(npm test)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DAILY_STEP_CAP,
  LOGIN_BONUS,
  POINTS_PER_CHUNK,
  chunksToPoints,
  claimableChunks,
  dateKey,
  stepsToNextChunk,
} from "./points.ts";

test("1000歩未満は受取なし", () => {
  assert.equal(claimableChunks(999, 0), 0);
});

test("1000歩ごとに1チャンク", () => {
  assert.equal(claimableChunks(1000, 0), 1);
  assert.equal(claimableChunks(3500, 0), 3);
});

test("受取済みチャンクは差し引く", () => {
  assert.equal(claimableChunks(3500, 2), 1);
  assert.equal(claimableChunks(3500, 3), 0);
});

test("受取済みが歩数を上回っても負にならない", () => {
  assert.equal(claimableChunks(1000, 5), 0);
});

test("1日1万歩で頭打ち", () => {
  assert.equal(claimableChunks(25000, 0), DAILY_STEP_CAP / 1000);
});

test("負の歩数は0扱い", () => {
  assert.equal(claimableChunks(-100, 0), 0);
});

test("ポイント換算", () => {
  assert.equal(chunksToPoints(3), 3 * POINTS_PER_CHUNK);
});

test("次のチャンクまでの歩数", () => {
  assert.equal(stepsToNextChunk(0), 1000);
  assert.equal(stepsToNextChunk(999), 1);
  assert.equal(stepsToNextChunk(1000), 1000);
  assert.equal(stepsToNextChunk(DAILY_STEP_CAP), 0);
  assert.equal(stepsToNextChunk(DAILY_STEP_CAP + 500), 0);
});

test("日付キーの形式", () => {
  assert.match(dateKey(new Date(2026, 6, 12)), /^2026-07-12$/);
});

test("ログインボーナスは正の値", () => {
  assert.ok(LOGIN_BONUS > 0);
});
