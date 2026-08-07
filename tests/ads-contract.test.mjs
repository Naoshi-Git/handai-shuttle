import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const adsSource = await readFile(new URL("../src/ads.mjs", import.meta.url), "utf8");
const adsCss = await readFile(new URL("../ads.css", import.meta.url), "utf8");
const spec = await readFile(new URL("../docs/AD-MONETIZATION-SPEC.md", import.meta.url), "utf8");

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

test("house ad includes a share CTA and brand asset", () => {
  assert.match(adsSource, /阪大シャトルを友達におすすめしよう/);
  assert.match(adsSource, /data-house-share/);
  assert.match(adsSource, /brand-icon-rounded\.svg/);
});

test("ad UI is visually distinct and touch friendly", () => {
  assert.match(adsCss, /\.ad-card-label/);
  assert.match(adsCss, /touch-action: manipulation/);
  assert.match(adsCss, /min-height: 100px/);
});

test("spec forbids high-risk placements", () => {
  assert.match(spec, /Bottom Sheet/);
  assert.match(spec, /sticky selector/);
  assert.match(spec, /便カードに見せるNative風実装/);
  assert.match(spec, /Vignette OFF/);
});
