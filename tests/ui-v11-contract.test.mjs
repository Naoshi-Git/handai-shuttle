import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const entry = await readFile(new URL("../src/features-v3.mjs", import.meta.url), "utf8");
const current = await readFile(new URL("../src/ui-current.mjs", import.meta.url), "utf8");
const css = await readFile(new URL("../src/ui-v11.css", import.meta.url), "utf8");

await import("../src/ui-current.mjs");

test("v11 visual scope is retained while behavior is owned by ui-current", () => {
  assert.doesNotMatch(entry, /import "\.\/ui-v11\.mjs";/);
  assert.match(entry, /import "\.\/ui-v13\.mjs";[\s\S]*import "\.\/ui-current\.mjs";/);
  assert.match(current, /classList\.add\("ui-v11", "ui-v14", "ui-v15", "ui-current"\)/);
});

test("app canvas is subtly off-white while content surfaces remain white", () => {
  assert.match(css, /--v11-canvas:\s*#F7F7F9/);
  assert.match(css, /--v11-surface:\s*#FFFFFF/);
  assert.match(css, /\.app-shell[\s\S]*var\(--v11-canvas\)/);
});

test("routine typography is reduced from legacy extra-bold weights", () => {
  assert.match(css, /\.brand-copy h1[\s\S]*font-weight:\s*700/);
  assert.match(css, /\.search-summary-main strong[\s\S]*font-weight:\s*600/);
  assert.match(css, /\.pill,[\s\S]*font-weight:\s*600/);
});

test("search timing and condition icons use aligned stroke SVGs", () => {
  assert.match(current, /search-timing-button \.search-summary-icon/);
  assert.match(current, /search-condition-button \.search-summary-icon/);
  assert.match(current, /iconSvg\(name\)/);
  assert.match(current, /clock:/);
  assert.match(current, /sliders:/);
  assert.match(css, /\.search-summary-icon \.v11-icon[\s\S]*19px/);
});

test("icon audit replaces legacy refresh swap and disclosure glyphs", () => {
  assert.match(current, /#refresh-button/);
  assert.match(current, /#swap-button/);
  assert.match(current, /#home-origin-button \.chevron/);
  assert.match(current, /\.tt-compact-chevron/);
  assert.match(css, /stroke-width:\s*1\.75/);
});

test("unnecessary frames and universal rounding are reduced", () => {
  assert.match(css, /\.search-summary-button[\s\S]*border-radius:\s*0/);
  assert.match(css, /route-timetable-card\[data-v4-compact="true"\][\s\S]*border-radius:\s*0/);
  assert.match(css, /\.search-panel,[\s\S]*border:\s*0 !important/);
});

test("house ads are square-edged and have no extra frame", () => {
  assert.match(css, /\.house-ad-card,[\s\S]*border:\s*0 !important/);
  assert.match(css, /\.house-ad-card,[\s\S]*border-radius:\s*0 !important/);
  assert.match(css, /\.house-ad-creative img[\s\S]*border-radius:\s*0 !important/);
});

test("saved search action no longer uses a star icon that implies trip favorite", () => {
  assert.match(current, /"条件を保存"/);
  assert.match(current, /"保存済み"/);
});
