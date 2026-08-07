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
