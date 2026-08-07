import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v3互換entry pointからv4 UIが読み込まれる", async () => {
  const wrapper = await read("src/features-v3.mjs");
  assert.match(wrapper, /features-v3-core\.mjs/);
  assert.match(wrapper, /ui-v4\.mjs/);
});

test("ホームの次便重複を除外するcontractを保持する", async () => {
  const source = await read("src/ui-v4.mjs");
  assert.match(source, /removeFeaturedDuplicate/);
  assert.match(source, /#next-card-content \.next-times/);
  assert.match(source, /#upcoming-list/);
});

test("時刻表はcompact rowとdetail sheetを備える", async () => {
  const source = await read("src/ui-v4.mjs");
  const css = await read("ui-v4.css");
  assert.match(source, /dataset\.v4Compact/);
  assert.match(source, /tt-detail-sheet/);
  assert.match(source, /showModal/);
  assert.match(css, /data-v4-compact/);
  assert.match(css, /tt-compact-row/);
  assert.match(css, /touch-action:manipulation/);
});

test("トップ・検索結果・時刻表では文字タグではなく人型混雑アイコンを使う", async () => {
  const source = await read("src/ui-v4.mjs");
  const css = await read("ui-v4.css");
  assert.match(source, /function crowdingIcon/);
  assert.match(source, /crowding-person/);
  assert.match(source, /decorateNextCardCrowding/);
  assert.match(source, /#search-results \.journey-card/);
  assert.match(source, /tt-sheet-crowding/);
  assert.match(css, /\.crowding-icon/);
  assert.match(css, /\.crowding-person/);
  assert.match(css, /crowding-lv5/);
  assert.match(css, /\.next-meta \.crowding-person/);
});

test("Bottom Sheetの経路線は全停留所共通の1本軸で描画する", async () => {
  const source = await read("src/ui-v4.mjs");
  const css = await read("ui-v4.css");
  assert.doesNotMatch(source, /tt-sheet-line/);
  assert.match(css, /\.tt-sheet-stops::before/);
  assert.match(css, /--tt-axis-x/);
  assert.match(css, /justify-self:center/);
});
