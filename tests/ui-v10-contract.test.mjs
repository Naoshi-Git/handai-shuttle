import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const entry = await readFile(new URL("../src/features-v3.mjs", import.meta.url), "utf8");
const source = await readFile(new URL("../src/ui-v10.mjs", import.meta.url), "utf8");
const css = await readFile(new URL("../src/ui-v10.css", import.meta.url), "utf8");
const ads = await readFile(new URL("../src/ads.mjs", import.meta.url), "utf8");

await import("../src/ui-v10.mjs");

test("v10 is the final presentation layer", () => {
  assert.match(entry, /import "\.\/ui-v9\.mjs";[\s\S]*import "\.\/ui-v10\.mjs";/);
});

test("all house placements start from the stable compact top banner creative", () => {
  assert.match(ads, /COMPACT_HOUSE_CREATIVE/);
  assert.match(ads, /house-banner-simple-640x89\.webp/);
  assert.match(ads, /SEARCH_PRIMARY\]: COMPACT_HOUSE_CREATIVE/);
  assert.match(ads, /SEARCH_INLINE\]: COMPACT_HOUSE_CREATIVE/);
  assert.match(ads, /TIMETABLE_HEADER\]: COMPACT_HOUSE_CREATIVE/);
  assert.match(ads, /TIMETABLE_INLINE\]: COMPACT_HOUSE_CREATIVE/);
});

test("v10 prevents older raster repair layers from replacing the compact banner", () => {
  assert.match(source, /slot\.dataset\.pngRasterized = "true"/);
  assert.match(source, /slot\.dataset\.v9EdgeFixed = "true"/);
  assert.match(source, /COMPACT_AD\.src/);
  assert.match(source, /attributeFilter: \["src", "style", "class"\]/);
  assert.match(css, /aspect-ratio:\s*640 \/ 89 !important/);
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

test("selected timetable and route controls use neutral surfaces instead of indigo fills", () => {
  assert.match(css, /route-timetable-card[\s\S]*\.is-next[\s\S]*background:\s*#FFF !important/);
  assert.match(css, /tt-destination-buttons button\.is-active[\s\S]*var\(--v10-surface-selected\)/);
  assert.match(css, /chip\.is-active[\s\S]*var\(--v10-surface-selected\)/);
  assert.match(css, /route-role\.is-origin[\s\S]*background:\s*#EFEFF2 !important/);
});

test("semantic surfaces stay neutral and reserve color for small cues", () => {
  assert.match(css, /service-banner:not\(\.is-closed\)[\s\S]*var\(--v10-surface-soft\)/);
  assert.match(css, /service-banner:not\(\.is-closed\)::before[\s\S]*var\(--v10-operating-dot\)/);
  assert.match(css, /pill-warning[\s\S]*var\(--v10-via-bg\)/);
});
