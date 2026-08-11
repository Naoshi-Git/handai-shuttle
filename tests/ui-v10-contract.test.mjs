import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const entry = await readFile(new URL("../src/features-v3.mjs", import.meta.url), "utf8");
const css = await readFile(new URL("../src/ui-v10.css", import.meta.url), "utf8");
const ads = await readFile(new URL("../src/ads.mjs", import.meta.url), "utf8");
const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

test("v10 is a CSS-only visual foundation rather than a second ad behavior owner", () => {
  assert.doesNotMatch(entry, /import "\.\/ui-v10\.mjs";/);
  assert.match(entry, /classList\.add\("ui-v10"\)/);
  assert.match(html, /ui-v10\.css" data-ui-v10/);
});

test("all house placements are created directly from the canonical compact creative", () => {
  assert.match(ads, /COMPACT_HOUSE_CREATIVE/);
  assert.match(ads, /house-banner-simple-640x89\.webp/);
  assert.match(ads, /HOME_FEED\]: COMPACT_HOUSE_CREATIVE/);
  assert.match(ads, /SEARCH_PRIMARY\]: COMPACT_HOUSE_CREATIVE/);
  assert.match(ads, /SEARCH_INLINE\]: COMPACT_HOUSE_CREATIVE/);
  assert.match(ads, /TIMETABLE_HEADER\]: COMPACT_HOUSE_CREATIVE/);
  assert.match(ads, /TIMETABLE_INLINE\]: COMPACT_HOUSE_CREATIVE/);
  assert.match(ads, /width:\s*640/);
  assert.match(ads, /height:\s*89/);
});

test("ad insertion observes only direct feed child changes", () => {
  assert.match(ads, /observer\.observe\(target, \{ childList: true, subtree: false \}\)/);
  assert.doesNotMatch(ads, /attributeFilter/);
});

test("location status wording is natural and distinguishes manual selection", () => {
  assert.match(css, /data-location-state="matched"\]::after \{ content: "取得済み"/);
  assert.match(css, /data-location-state="manual"\]::after \{ content: "手動選択"/);
  assert.match(css, /data-location-state="loading"\]::after \{ content: "取得中…"/);
  assert.match(css, /data-location-state="failed"\]::after \{ content: "再取得"/);
});

test("typography uses a near-black system stack instead of pure black", () => {
  assert.match(css, /--ink:\s*#1F1F24/);
  assert.match(css, /font-family:\s*-apple-system, BlinkMacSystemFont, "Hiragino Sans"/);
  assert.doesNotMatch(css, /--ink:\s*#000(?:000)?\b/i);
});

test("semantic surfaces stay neutral and reserve color for small cues", () => {
  assert.match(css, /service-banner:not\(\.is-closed\)[\s\S]*var\(--v10-surface-soft\)/);
  assert.match(css, /service-banner:not\(\.is-closed\)::before[\s\S]*var\(--v10-operating-dot\)/);
  assert.match(css, /pill-warning[\s\S]*var\(--v10-via-bg\)/);
});
