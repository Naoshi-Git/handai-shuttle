import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";

const adsSource = await readFile(new URL("../src/ads.mjs", import.meta.url), "utf8");
const adsCss = await readFile(new URL("../ads.css", import.meta.url), "utf8");
const spec = await readFile(new URL("../docs/AD-MONETIZATION-SPEC.md", import.meta.url), "utf8");
const manifest = JSON.parse(await readFile(new URL("../assets/ads/house/creative-manifest.json", import.meta.url), "utf8"));

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

test("house ads use standalone creative assets instead of expanding the brand icon in app UI", () => {
  assert.match(adsSource, /house-mobile-320x100\.png/);
  assert.match(adsSource, /house-mobile-320x50\.png/);
  assert.match(adsSource, /data-house-share/);
  assert.doesNotMatch(adsSource, /ad-card-icon/);
  assert.match(adsCss, /width: min\(100%, 320px\)/);
});

test("Google-compatible uploaded image creatives stay under 150KB", async () => {
  for (const asset of manifest.assets) {
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
