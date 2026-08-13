import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("shared journey image uses one aligned metadata row and no decorative clutter", async () => {
  const source = await read("src/share-card.mjs");

  assert.doesNotMatch(source, /阪大シャトルを開く/);
  assert.doesNotMatch(source, /時間割ベースの推定/);
  assert.doesNotMatch(source, /safeText\(data\.sourceLabel/);
  assert.doesNotMatch(source, /safeText\(data\.date\)[\s\S]*fillText/);
  assert.doesNotMatch(source, /stopLine/);
  assert.doesNotMatch(source, /ctx\.arc\(870,\s*630/);
  assert.match(source, /function drawDirectionalArrow/);
  assert.match(source, /const pillY = 475/);
  assert.match(source, /drawPill\(ctx, routeType, pillX, pillY/);
  assert.match(source, /drawPill\(ctx, safeText\(data\.duration\), pillX, pillY/);
  assert.ok((source.match(/pillX, pillY/g) || []).length >= 3);
});

test("share card separates normal text baselines from vertically centered pills", async () => {
  const source = await read("src/share-card.mjs");

  assert.match(source, /function drawShareHeader[\s\S]*textBaseline = "alphabetic"/);
  assert.match(source, /function drawPill[\s\S]*textBaseline = "middle"/);
  assert.match(source, /function drawProductIntro/);
  assert.match(source, /function drawDisclaimer/);
});

test("share panel distinguishes image sharing from link-only copying", async () => {
  const source = await read("src/share-card.mjs");

  assert.match(source, /便情報を画像で共有できます。/);
  assert.match(source, />画像を共有<\/button>/);
  assert.match(source, />リンクだけコピー<\/button>/);
});
