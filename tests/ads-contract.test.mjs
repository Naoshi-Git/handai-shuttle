import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const adsSource = await readFile(new URL("../src/ads.mjs", import.meta.url), "utf8");
const adsCss = await readFile(new URL("../ads.css", import.meta.url), "utf8");
const spec = await readFile(new URL("../docs/AD-MONETIZATION-SPEC.md", import.meta.url), "utf8");
const wideCreative = await readFile(new URL("../assets/ads/house-share-640x180.svg", import.meta.url), "utf8");
const compactCreative = await readFile(new URL("../assets/ads/house-share-640x128.svg", import.meta.url), "utf8");

await import("../src/ads.mjs");

test("ad architecture exposes the three planned placements", () => {
  assert.match(adsSource, /home-feed/);
  assert.match(adsSource, /search-results/);
  assert.match(adsSource, /timetable-feed/);
});

test("current implementation defaults to house ads and keeps AdSense as a future provider", () => {
  assert.match(adsSource, /DEFAULT_MODE = "house"/);
  assert.match(adsSource, /data-ad-provider=\"house\"/);
  assert.match(adsSource, /data-ad-provider=\"adsense\"/);
  assert.doesNotMatch(adsSource, /pagead2\.googlesyndication\.com/);
});

test("house ads are rendered from dedicated responsive creative assets", () => {
  assert.match(adsSource, /house-share-640x180\.svg/);
  assert.match(adsSource, /house-share-640x128\.svg/);
  assert.match(adsSource, /data-house-share/);
  assert.match(wideCreative, /友達にも、次の便を。/);
  assert.match(compactCreative, /共有する/);
});

test("ad UI constrains creative dimensions and remains touch friendly", () => {
  assert.match(adsCss, /\.house-ad-creative img/);
  assert.match(adsCss, /aspect-ratio: 640 \/ 180/);
  assert.match(adsCss, /aspect-ratio: 640 \/ 128/);
  assert.match(adsCss, /touch-action: manipulation/);
  assert.match(adsCss, /min-height: 100px/);
});

test("spec forbids high-risk placements and documents creative masters", () => {
  assert.match(spec, /Bottom Sheet/);
  assert.match(spec, /sticky selector/);
  assert.match(spec, /便カードに見せるNative風実装/);
  assert.match(spec, /Vignette OFF/);
  assert.match(spec, /house-share-640x180\.svg/);
  assert.match(spec, /1280×360 PNG/);
});
