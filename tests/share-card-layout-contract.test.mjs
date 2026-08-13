import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("sharing normalizes every source into the Home next-card UI before snapshotting", async () => {
  const share = await read("src/share-card.mjs");
  const surface = await read("src/share-surface.mjs");

  assert.match(share, /mountShareSurface/);
  assert.match(share, /snapshotElementToPng\(mounted\.element/);
  assert.match(share, /ホームの次便カードと同じUIで画像化します。/);
  assert.match(surface, /document\.querySelector\("#next-card"\)/);
  assert.match(surface, /source\.cloneNode\(true\)/);
  assert.match(surface, /next-route/);
  assert.match(surface, /next-times/);
  assert.match(surface, /next-meta next-meta-v4/);
  assert.doesNotMatch(share, /drawBrandMark/);
  assert.doesNotMatch(share, /createElement\(["']canvas["']\)/);
  assert.doesNotMatch(share, /fillText\(/);
});

test("share surface has one canonical width across Home, Search and Timetable", async () => {
  const surface = await read("src/share-surface.mjs");

  assert.match(surface, /const SHARE_CARD_WIDTH = 343/);
  assert.match(surface, /width:\$\{SHARE_CARD_WIDTH \+ SHARE_STAGE_PADDING \* 2\}px/);
  assert.match(surface, /card\.style\.width = `\$\{SHARE_CARD_WIDTH\}px`/);
  assert.match(surface, /card\.style\.minWidth = `\$\{SHARE_CARD_WIDTH\}px`/);
  assert.match(surface, /card\.style\.maxWidth = `\$\{SHARE_CARD_WIDTH\}px`/);
  assert.doesNotMatch(surface, /getBoundingClientRect\(\)\.width/);
  assert.doesNotMatch(surface, /offsetWidth/);
});

test("short metadata never ellipsizes and stop detail may shrink without stretching", async () => {
  const surface = await read("src/share-surface.mjs");

  assert.match(surface, /item\.style\.flex = "0 0 auto"/);
  assert.match(surface, /item\.style\.textOverflow = "clip"/);
  assert.match(surface, /originItem\.style\.flex = "0 1 auto"/);
  assert.match(surface, /originItem\.style\.maxWidth = "112px"/);
  assert.doesNotMatch(surface, /originItem\.style\.flex = "1 1 auto"/);
});

test("promo copy uses explicit stable lines instead of incidental wrapping", async () => {
  const surface = await read("src/share-surface.mjs");

  assert.match(surface, /tagline\.textContent = "次の便・最終便・混雑目安を、すぐ確認。"/);
  assert.match(surface, /url\.textContent = DISPLAY_URL/);
  assert.match(surface, /disclaimer\.textContent = "大阪大学 非公式Webアプリ"/);
  assert.match(surface, /white-space:nowrap/);
  assert.match(surface, /brand-icon-rounded\.svg/);
  assert.doesNotMatch(surface, /阪大シャトルを開く/);
});

test("DOM snapshot engine is pinned and includes Safari warmup", async () => {
  const source = await read("src/dom-snapshot.mjs");

  assert.match(source, /@zumer\/snapdom@2\.8\.0/);
  assert.match(source, /safariWarmupAttempts:\s*4/);
  assert.match(source, /scale/);
  assert.match(source, /toBlob\(\{ type: "png" \}\)/);
});

test("share panel distinguishes image sharing from link-only copying", async () => {
  const source = await read("src/share-card.mjs");

  assert.match(source, />画像を共有<\/button>/);
  assert.match(source, />リンクだけコピー<\/button>/);
  assert.match(source, /阪大シャトルの次便カード形式の共有画像/);
});
