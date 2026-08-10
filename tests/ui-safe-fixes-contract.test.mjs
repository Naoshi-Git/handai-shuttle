import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../src/ui-safe-fixes.mjs", import.meta.url), "utf8");
const features = await readFile(new URL("../src/features-v3.mjs", import.meta.url), "utf8");

await import("../src/ui-safe-fixes.mjs");

test("safe fixes load after the established runtime", () => {
  assert.match(features, /import "\.\/ui-runtime\.mjs";[\s\S]*import "\.\/ui-safe-fixes\.mjs";/);
});

test("favorite normalization cannot self-trigger forever", () => {
  assert.match(source, /node\.textContent !== wanted\) node\.textContent = wanted/);
  assert.match(source, /subtitle\.textContent !== FAVORITE_SUBTITLE/);
  assert.match(source, /observer\.observe\(section,/);
  assert.doesNotMatch(source, /observer\.observe\(document\.body/);
});

test("safe fixes do not hijack bottom navigation transitions", () => {
  assert.doesNotMatch(source, /startViewTransition/);
  assert.doesNotMatch(source, /navReplayGuard/);
  assert.doesNotMatch(source, /activeView\.animate/);
  assert.doesNotMatch(source, /stopImmediatePropagation\(/);
});

test("redundant segmented clicks are stopped before legacy rerenders", () => {
  assert.match(source, /window\.addEventListener\("click", maskLegacyHomeDelay, true\)/);
  assert.match(source, /redundantSelectionButton/);
  assert.match(source, /event\.stopPropagation\(\)/);
  assert.match(source, /\.tt-campus-tabs \[data-tt-origin\]\.is-active/);
  assert.match(source, /#home-destination-chips \[data-home-destination\]\.is-active/);
});

test("legacy delayed Home repaint is bypassed without replacing startup architecture", () => {
  assert.match(source, /homeButton\.removeAttribute\("data-home-destination"\)/);
  assert.match(source, /restoreHomeDestinationMarker/);
  assert.match(source, /maskedHomeDestination/);
  assert.doesNotMatch(source, /setTimeout\([^\n]*30/);
});

test("segmented motion freezes the unchanged timetable track", () => {
  assert.match(source, /runtime-freeze-tt-origin/);
  assert.match(source, /runtime-freeze-tt-destination/);
  assert.match(source, /transition:\s*none !important/);
  assert.match(source, /\.runtime-choice-track > button:active[\s\S]*transform:\s*none !important/);
  assert.match(source, /transform 240ms cubic-bezier\(\.25,\.1,\.25,1\)/);
});

test("tab and sheet timings use distinct motion roles", () => {
  assert.match(source, /safe-view-enter 220ms/);
  assert.match(source, /translate3d\(0, 2px, 0\)/);
  assert.match(source, /safe-sheet-enter 340ms/);
  assert.match(source, /translate3d\(0, 14px, 0\)/);
});

test("page gutters and Result heading use a consistent spacing axis", () => {
  assert.match(source, /--safe-page-gutter:\s*18px/);
  assert.match(source, /#view-search \.results-section > \.section-title-row/);
  assert.match(source, /padding-left:\s*4px !important/);
  assert.match(source, /\.search-sheet-shell,[\s\S]*\.tt-sheet-shell/);
});

test("top-left brand mark is keyboard accessible and returns Home", () => {
  assert.match(source, /aria-label", "ホームへ戻る"/);
  assert.match(source, /mark\.addEventListener\("click", goHome\)/);
  assert.match(source, /data-nav='home'/);
  assert.match(source, /event\.key !== "Enter"/);
});
