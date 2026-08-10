import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const entry = await readFile(new URL("../src/features-v3.mjs", import.meta.url), "utf8");
const runtime = await readFile(new URL("../src/ui-runtime.mjs", import.meta.url), "utf8");
const css = await readFile(new URL("../src/ui-v15.css", import.meta.url), "utf8");
const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const whiteSymbol = await readFile(new URL("../assets/brand/brand-symbol-white.svg", import.meta.url), "utf8");

await import("../src/ui-runtime.mjs");

test("v15 visual CSS remains linked while runtime owns behavior", () => {
  assert.doesNotMatch(entry, /import "\.\/ui-v15\.mjs";/);
  assert.match(entry, /import "\.\/ui-v13\.mjs";[\s\S]*import "\.\/ui-runtime\.mjs";/);
  assert.match(runtime, /"ui-v15"/);
  assert.match(html, /ui-v14\.css" data-ui-v14[\s\S]*ui-v15\.css" data-ui-v15/);
});

test("splash uses a reliable exact white brand symbol and no broken raster transition", () => {
  assert.match(html, /brand-symbol-white\.svg/);
  assert.doesNotMatch(html, /splash-white\.webp|splash-black\.webp|splash-gradient\.webp/);
  assert.doesNotMatch(html, /boot-bg/);
  assert.match(html, /background:#2d287f/);
  assert.match(whiteSymbol, /fill="#FFFFFF"/);
  assert.match(whiteSymbol, /translate\(162\.000 216\.823\) scale\(2\.341137\)/);
});

test("bottom navigation uses regular material and one moving selection glider", () => {
  assert.match(css, /\.bottom-nav[\s\S]*blur\(28px\) saturate\(165%\)/);
  assert.match(css, /\.bottom-nav::before,[\s\S]*\.bottom-nav::after[\s\S]*display:\s*none/);
  assert.match(css, /\.nav-glider-v15[\s\S]*--v15-nav-glider-x/);
  assert.match(runtime, /nav-glider-v15/);
  assert.match(runtime, /getBoundingClientRect/);
  assert.match(runtime, /--v15-nav-glider-x/);
});

test("route editor is one composed two-row control with a dedicated swap gutter", () => {
  assert.match(css, /\.route-editor[\s\S]*grid-template-columns:\s*minmax\(0,1fr\) 44px/);
  assert.match(css, /\.swap-button[\s\S]*grid-column:\s*2[\s\S]*grid-row:\s*1 \/ span 2/);
  assert.match(css, /\.swap-button[\s\S]*position:\s*relative !important/);
  assert.match(css, /\.route-line:first-child::after[\s\S]*background:\s*var\(--v15-route-divider\)/);
});

test("low resolution install screenshots are detected and no longer over-enlarged", () => {
  assert.match(runtime, /naturalWidth < 360/);
  assert.match(runtime, /is-low-res-source-v15/);
  assert.match(css, /\.install-guide-media\.is-low-res-source-v15 img[\s\S]*180px/);
});

test("legacy v15 motion remains accessible while runtime provides final timing", () => {
  assert.match(css, /--v15-motion:\s*cubic-bezier/);
  assert.match(css, /@keyframes v15-view-enter/);
  assert.match(css, /prefers-reduced-transparency/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(runtime, /ui-runtime/);
});
