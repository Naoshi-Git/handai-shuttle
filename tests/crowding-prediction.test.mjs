import test from "node:test";
import assert from "node:assert/strict";

import { predictCrowding } from "../src/crowding-prediction.mjs";

test("授業開始10分前に到着する便は最上位の混雑予想になる", () => {
  const prediction = predictCrowding({ departureTime: "16:20", arrivalTime: "16:40" });
  assert.equal(prediction.level, 5);
  assert.equal(prediction.label, "かなり混雑");
  assert.match(prediction.reason, /5限開始10分前/);
});

test("通常の授業終了直後に出発する便は比較的高い混雑予想になる", () => {
  const prediction = predictCrowding({ departureTime: "16:50", arrivalTime: "17:20" });
  assert.equal(prediction.level, 4);
  assert.match(prediction.reason, /4限終了10分後/);
});

test("授業ピークから余裕がある便は混雑予想を緩和する", () => {
  const prediction = predictCrowding({ departureTime: "15:30", arrivalTime: "15:55" });
  assert.equal(prediction.level, 2);
  assert.equal(prediction.label, "混雑小");
});

test("6限開始は混雑根拠に使わない", () => {
  const prediction = predictCrowding({ departureTime: "18:00", arrivalTime: "18:20" });
  assert.equal(prediction.level, 1);
  assert.doesNotMatch(prediction.reason, /6限/);
});

test("5限終了直後の便はその日の最終移動ラッシュとして最上位になる", () => {
  const prediction = predictCrowding({ departureTime: "18:30", arrivalTime: "19:00" });
  assert.equal(prediction.level, 5);
  assert.match(prediction.reason, /5限終了10分後の移動ラッシュ/);
});

test("5限終了後も時間が経つほど混雑予想は緩和する", () => {
  assert.equal(predictCrowding({ departureTime: "18:45", arrivalTime: "19:10" }).level, 4);
  assert.equal(predictCrowding({ departureTime: "19:00", arrivalTime: "19:25" }).level, 3);
  assert.equal(predictCrowding({ departureTime: "19:25", arrivalTime: "20:05" }).level, 2);
});
