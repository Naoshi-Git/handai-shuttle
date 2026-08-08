import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../src/ui-v7-fixes.mjs", import.meta.url), "utf8");
const css = await readFile(new URL("../ui-v7.css", import.meta.url), "utf8");
const features = await readFile(new URL("../src/features-v3.mjs", import.meta.url), "utf8");
const compact = await readFile(new URL("../assets/ads/house/v3/house-compact-fullbleed-640x89.svg", import.meta.url), "utf8");
const inline = await readFile(new URL("../assets/ads/house/v3/house-inline-fullbleed-640x180.svg", import.meta.url), "utf8");

await import("../src/ui-v7-fixes.mjs");

test("v7 correction layer is loaded after v6", () => {
  assert.match(features, /import "\.\/ui-v6\.mjs";[\s\S]*import "\.\/ui-v7-fixes\.mjs";/);
});

test("favorite trip ids are normalized and all saved favorites open in timetable", () => {
  assert.match(source, /replace\(\/便\$\/u, ""\)/);
  assert.match(source, /source:\s*"timetable"/);
  assert.match(source, /function openFavoriteInTimetable/);
  assert.match(source, /data-nav="timetable"/);
  assert.doesNotMatch(source, /data-nav="search"/);
  assert.match(source, /normalizeTripId\(item\.tripId\).*便/);
});

test("favorite settings are promoted to the top and use canonical campus labels", () => {
  assert.match(source, /heading\.insertAdjacentElement\("afterend", favorites\)/);
  assert.match(source, /favorites\.insertAdjacentElement\("afterend", searches\)/);
  assert.match(source, /タップすると時刻表の該当便へ移動します/);
  assert.match(source, /campusLabel\(item\.origin/);
  assert.match(source, /campusLabel\(item\.destination/);
});

test("house ads use full-bleed creatives with one CSS-owned rounded clipping surface", () => {
  assert.match(source, /house-compact-fullbleed-640x89\.svg/);
  assert.match(source, /house-inline-fullbleed-640x180\.svg/);
  assert.match(compact, /<rect width="640" height="89" fill="#FAFAFC"\/>/);
  assert.match(inline, /<rect width="640" height="180" fill="#FAFAFC"\/>/);
  assert.doesNotMatch(compact, /<rect x="1" y="1" width="638"/);
  assert.doesNotMatch(inline, /<rect x="1" y="1" width="638"/);
  assert.match(css, /\.house-ad-card[\s\S]*overflow:\s*hidden/);
  assert.match(css, /clip-path:\s*inset\(0 round var\(--ad-shell-radius\)\)/);
  assert.match(css, /-webkit-mask-image:\s*-webkit-radial-gradient/);
  assert.match(css, /\.house-ad-creative,[\s\S]*border-radius:\s*0 !important/);
});
