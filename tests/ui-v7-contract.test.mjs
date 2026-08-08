import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../src/ui-v7-fixes.mjs", import.meta.url), "utf8");
const css = await readFile(new URL("../ui-v7.css", import.meta.url), "utf8");
const features = await readFile(new URL("../src/features-v3.mjs", import.meta.url), "utf8");

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

test("house ads are displayed as PNG rasters with corrected corners", () => {
  assert.match(source, /house-banner-simple-640x89\.webp/);
  assert.match(source, /house-banner-feature-640x213\.webp/);
  assert.match(source, /house-rectangle-600x500\.svg/);
  assert.match(source, /canvas\.toDataURL\("image\/png"\)/);
  assert.match(source, /image\.dataset\.rasterFormat = "png"/);
  assert.match(source, /roundedRectPath/);
  assert.match(css, /\.house-ad-card[\s\S]*overflow:\s*hidden/);
  assert.match(css, /contain:\s*paint/);
  assert.doesNotMatch(css, /clip-path:/);
  assert.doesNotMatch(css, /-webkit-mask-image:/);
});

test("favorite timetable navigation measures sticky layers and corrects final scroll position", () => {
  assert.match(source, /function timetableStickyInset/);
  assert.match(source, /\.topbar/);
  assert.match(source, /ad-slot-timetable-header/);
  assert.match(source, /#timetable-route-controls/);
  assert.match(source, /function preciseFavoriteScroll/);
  assert.match(source, /window\.scrollY \+ delta/);
  assert.match(source, /\[280, 520, 900\]/);
  assert.doesNotMatch(source, /scrollIntoView/);
});
