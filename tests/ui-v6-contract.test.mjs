import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../src/ui-v6.mjs", import.meta.url), "utf8");
const css = await readFile(new URL("../ui-v5.css", import.meta.url), "utf8");
const adsSource = await readFile(new URL("../src/ads.mjs", import.meta.url), "utf8");
const adsCss = await readFile(new URL("../ads.css", import.meta.url), "utf8");
await import("../src/ui-v6.mjs");

test("saved search conditions and favorite trips use separate storage concepts", () => {
  assert.match(source, /ou-bus:saved-searches/);
  assert.match(source, /ou-bus:favorite-trips/);
  assert.match(source, /ou-bus:saved-routes/);
  assert.match(source, /保存した検索条件/);
  assert.match(source, /お気に入り便/);
  assert.match(source, /☆ 条件を保存/);
});

test("favorite controls are attached to search and timetable cards", () => {
  assert.match(source, /journey-favorite-button/);
  assert.match(source, /tt-favorite-button/);
  assert.match(source, /data-tt-trip/);
  assert.match(css, /\.route-timetable-card\.is-favorite-trip/);
  assert.match(css, /\.journey-card\.is-favorite-trip/);
});

test("utility headers remove decorative English and bottom navigation uses consistent SVG icons", () => {
  assert.match(css, /data-active-view="search"[\s\S]*\.topbar \.eyebrow/);
  assert.match(source, /class="nav-icon"/);
  for (const label of ["ホーム", "ルート検索", "時刻表", "設定"]) assert.match(source, new RegExp(label));
});

test("visual system restricts semantic warning and route-via styling to restrained tones", () => {
  assert.match(css, /--ui-warning-bg:\s*#FFF7E7/);
  assert.match(css, /\.pill-warning[\s\S]*#F8F2E6/);
  assert.match(css, /\.service-banner\.is-closed/);
  assert.match(css, /--ui-card-radius:\s*16px/);
  assert.match(css, /--ui-control-radius:\s*12px/);
});

test("search inline ad uses vector creative and shared card radius without black raster corners", () => {
  assert.match(adsSource, /house-inline-640x180\.svg/);
  assert.match(adsSource, /ratio:\s*"640 \/ 180"/);
  assert.match(adsCss, /\.ad-slot-search-inline \.house-ad-creative[\s\S]*border-radius:\s*16px/);
  assert.match(adsCss, /\.ad-slot-search-inline \.house-ad-creative[\s\S]*overflow:\s*hidden/);
});

test("view transitions are subtle and respect reduced motion", () => {
  assert.match(css, /@keyframes v6-view-enter/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(source, /window\.scrollTo\(\{ top: 0, behavior: "auto" \}\)/);
});
