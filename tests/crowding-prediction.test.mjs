import test from "node:test";
import assert from "node:assert/strict";

import { predictCrowding } from "../src/crowding-prediction.mjs";

test("授業開始10分前に到着する便は最上位の混雑予想になる", () => {
  const prediction = predictCrowding({ departureTime: "16:20", arrivalTime: "16:40" });
  assert.equal(prediction.level, 5);
  assert.equal(prediction.label, "かなり混雑");
  assert.match(prediction.reason, /5限開始10分前/);
});

test("授業終了直後に出発する便は比較的高い混雑予想になる", () => {
  const prediction = predictCrowding({ departureTime: "16:50", arrivalTime: "17:20" });
  assert.equal(prediction.level, 4);
  assert.match(prediction.reason, /4限終了10分後/);
});

test("授業ピークから余裕がある便は混雑予想を緩和する", () => {
  const prediction = predictCrowding({ departureTime: "15:30", arrivalTime: "15:55" });
  assert.equal(prediction.level, 2);
  assert.equal(prediction.label, "混雑小");
});

test("18:20着は6限開始10分前なので最上位になる", () => {
  const prediction = predictCrowding({ departureTime: "18:00", arrivalTime: "18:20" });
  assert.equal(prediction.level, 5);
  assert.match(prediction.reason, /6限開始10分前/);
});
