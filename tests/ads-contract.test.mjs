import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";

const adsSource = await readFile(new URL("../src/ads.mjs", import.meta.url), "utf8");
const adsCss = await readFile(new URL("../ads.css", import.meta.url), "utf8");
const spec = await readFile(new URL("../docs/AD-MONETIZATION-SPEC.md", import.meta.url), "utf8");

await import("../src/ads.mjs");

test("ad architecture exposes home, search and timetable primary/inline placements", () => {
  for (const token of ["home-feed", "search-primary", "search-inline", "timetable-header", "timetable-inline"]) {
    assert.match(adsSource, new RegExp(token));
  }
});

test("current implementation defaults to house ads and keeps AdSense as a future provider", () => {
  assert.match(adsSource, /DEFAULT_MODE = "house"/);
  assert.match(adsSource, /data-ad-provider="house"/);
  assert.match(adsSource, /data-ad-provider="adsense"/);
  assert.doesNotMatch(adsSource, /pagead2\.googlesyndication\.com/);
});

test("v2 house creatives use standalone high-resolution WebP assets without runtime cropping", async () => {
  const assets = [
    "../assets/ads/house/v2/house-banner-simple-640x89.webp",
    "../assets/ads/house/v2/house-banner-feature-640x213.webp"
  ];
  for (const relative of assets) {
    const info = await stat(new URL(relative, import.meta.url));
    assert.ok(info.size > 0, `${relative} is empty`);
    assert.ok(info.size <= 150 * 1024, `${relative} exceeds 150KB`);
  }
  assert.match(adsCss, /object-fit:\s*contain/);
  assert.doesNotMatch(adsCss, /object-fit:\s*cover/);
});

test("Yahoo-style placement keeps a primary ad outside the search form and a sticky timetable header ad", () => {
  assert.match(adsSource, /form\.insertAdjacentElement\("afterend", createSlot\(AD_PLACEMENTS\.SEARCH_PRIMARY\)\)/);
  assert.match(adsSource, /controls\.insertAdjacentElement\("beforebegin", createSlot\(AD_PLACEMENTS\.TIMETABLE_HEADER\)\)/);
  assert.match(adsCss, /\.ad-slot-timetable-header\s*\{[\s\S]*position:\s*sticky/);
});

test("long result feeds get occasional, bounded inline ads", () => {
  assert.match(adsSource, /placement:\s*AD_PLACEMENTS\.SEARCH_INLINE,[\s\S]*every:\s*4,[\s\S]*max:\s*2/);
  assert.match(adsSource, /placement:\s*AD_PLACEMENTS\.TIMETABLE_INLINE,[\s\S]*every:\s*8,[\s\S]*max:\s*2/);
});

test("spec still forbids high-risk placements", () => {
  assert.match(spec, /Bottom Sheet/);
  assert.match(spec, /sticky selector/);
  assert.match(spec, /便カードに見せるNative風実装/);
  assert.match(spec, /Vignette OFF/);
});
