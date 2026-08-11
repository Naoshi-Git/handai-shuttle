import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../src/ui-v6.mjs", import.meta.url), "utf8");
const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const lifecycleCss = await readFile(new URL("../src/view-lifecycle.css", import.meta.url), "utf8");
const adsSource = await readFile(new URL("../src/ads.mjs", import.meta.url), "utf8");
const adsCss = await readFile(new URL("../ads.css", import.meta.url), "utf8");
const systemCss = await readFile(new URL("../src/ui-system.css", import.meta.url), "utf8");
await import("../src/ui-v6.mjs");

test("saved search conditions and favorite trips use separate storage concepts", () => {
  assert.match(source, /ou-bus:saved-searches/);
  assert.match(source, /ou-bus:favorite-trips/);
  assert.match(source, /ou-bus:saved-routes/);
  assert.match(source, /保存した検索条件/);
  assert.match(source, /お気に入り便/);
  assert.match(source, /☆ 条件を保存/);
});

test("v6 behavior no longer creates a presentation runtime scope", () => {
  assert.doesNotMatch(source, /classList\.add\("ui-v6"\)/);
  assert.doesNotMatch(systemCss, /body\.ui-v6/);
  assert.doesNotMatch(html, /ui-v5\.css|ui-foundation\.css/);
});

test("favorite controls stay behavior-owned while presentation stays semantic", () => {
  assert.match(source, /journey-favorite-button/);
  assert.match(source, /tt-favorite-button/);
  assert.match(source, /data-tt-trip/);
  assert.match(systemCss, /\.journey-card\.is-favorite-trip/);
  assert.match(systemCss, /\.tt-favorite-button/);
  assert.doesNotMatch(systemCss, /\.route-timetable-card\.is-favorite-trip/);
  assert.match(systemCss, /route-timetable-card\.favorite-flash[\s\S]*animation:\s*none !important/);
});

test("app header removes decorative English from the DOM and bottom navigation uses consistent SVG icons", () => {
  assert.doesNotMatch(html, /<p class="eyebrow">/);
  assert.doesNotMatch(systemCss, /\.topbar \.eyebrow/);
  assert.match(source, /class="nav-icon"/);
  for (const label of ["ホーム", "ルート検索", "時刻表", "設定"]) assert.match(source, new RegExp(label));
});

test("utility variables remain only where the absorbed semantic system consumes them", () => {
  assert.match(systemCss, /--ui-sheet-radius:\s*24px/);
  assert.match(systemCss, /--ui-control-radius:\s*12px/);
  assert.match(systemCss, /--ui-favorite:\s*#A97916/);
  assert.doesNotMatch(systemCss, /body\.ui-v6 \.pill-warning/);
  assert.doesNotMatch(systemCss, /body\.ui-v6 \.service-banner\.is-closed/);
  assert.match(systemCss, /body\.ui-system \.pill-warning[\s\S]*#F2EFEA/);
  assert.match(systemCss, /body\.ui-system \.service-banner\.is-closed/);
});

test("final ad layer keeps the compact creative ratio while semantic presentation owns framing", () => {
  assert.match(adsSource, /house-banner-simple-640x89\.webp/);
  assert.match(adsSource, /ratio:\s*"640 \/ 89"/);
  assert.doesNotMatch(adsSource, /house-inline-640x180\.svg|house-rectangle-600x500\.svg/);
  assert.match(adsCss, /aspect-ratio:\s*var\(--house-ad-ratio,\s*640 \/ 89\)/);
  assert.match(systemCss, /\.house-ad-card,[\s\S]*border-radius:\s*0 !important/);
});

test("tab transitions are owned by the current lifecycle and respect reduced motion", () => {
  assert.doesNotMatch(systemCss, /v6-view-enter/);
  assert.match(lifecycleCss, /view-crossfade-leaving/);
  assert.match(lifecycleCss, /prefers-reduced-motion/);
  assert.match(source, /window\.scrollTo\(\{ top: 0, behavior: "auto" \}\)/);
});
