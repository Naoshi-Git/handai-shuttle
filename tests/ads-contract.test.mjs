import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";

const adsSource = await readFile(new URL("../src/ads.mjs", import.meta.url), "utf8");
const adsCss = await readFile(new URL("../ads.css", import.meta.url), "utf8");
const spec = await readFile(new URL("../docs/AD-MONETIZATION-SPEC.md", import.meta.url), "utf8");
const placementSpec = await readFile(new URL("../docs/AD-PLACEMENT-V2.md", import.meta.url), "utf8");
const manifest = JSON.parse(await readFile(new URL("../assets/ads/house/creative-manifest-v2.json", import.meta.url), "utf8"));

await import("../src/ads.mjs");

test("ad architecture exposes the three planned placements", () => {
  assert.match(adsSource, /home-feed/);
  assert.match(adsSource, /search-results/);
  assert.match(adsSource, /timetable-feed/);
});

test("current implementation defaults to house ads and keeps AdSense as a future provider", () => {
  assert.match(adsSource, /DEFAULT_MODE = "house"/);
  assert.match(adsSource, /data-ad-provider="house"/);
  assert.match(adsSource, /data-ad-provider="adsense"/);
  assert.doesNotMatch(adsSource, /pagead2\.googlesyndication\.com/);
});

test("runtime uses user-provided v2 creatives with no crop", () => {
  assert.match(adsSource, /house-banner-simple-640x89\.webp/);
  assert.match(adsSource, /house-banner-feature-640x213\.webp/);
  assert.match(adsCss, /object-fit: contain/);
  assert.match(placementSpec, /トリミングを禁止/);
});

test("Yahoo-reference placement keeps ads outside route controls", () => {
  assert.match(adsSource, /quick-actions/);
  assert.match(adsSource, /container\.insertBefore\(createSlot\(AD_PLACEMENTS\.SEARCH_RESULTS\), firstCard\)/);
  assert.match(adsSource, /container\.insertBefore\(createSlot\(AD_PLACEMENTS\.TIMETABLE_FEED\), firstRow\)/);
  assert.match(placementSpec, /検索UIの直後/);
  assert.match(placementSpec, /時刻表リストの直前/);
});

test("v2 runtime assets exist and stay lightweight", async () => {
  for (const asset of manifest.runtimeAssets) {
    const file = new URL(`../assets/ads/house/${asset.file}`, import.meta.url);
    const info = await stat(file);
    assert.ok(info.size > 0, `${asset.file} is empty`);
    assert.ok(info.size <= 150 * 1024, `${asset.file} exceeds 150KB`);
  }
});

test("spec forbids high-risk placements", () => {
  assert.match(spec, /Bottom Sheet/);
  assert.match(spec, /sticky selector/);
  assert.match(spec, /便カードに見せるNative風実装/);
  assert.match(spec, /Vignette OFF/);
});
