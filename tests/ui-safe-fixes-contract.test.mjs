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

test("safe fixes never intercept or replay navigation", () => {
  assert.doesNotMatch(source, /preventDefault\(/);
  assert.doesNotMatch(source, /stopImmediatePropagation\(/);
  assert.doesNotMatch(source, /\.click\(\).*nav|nav.*\.click\(/s);
});

test("segmented motion freezes the unchanged timetable track", () => {
  assert.match(source, /runtime-freeze-tt-origin/);
  assert.match(source, /runtime-freeze-tt-destination/);
  assert.match(source, /transition:\s*none !important/);
  assert.match(source, /\.runtime-choice-track > button:active[\s\S]*transform:\s*none !important/);
});

test("tab and sheet refinements are CSS-only compositor motion", () => {
  assert.match(source, /safe-view-enter 300ms/);
  assert.match(source, /translate3d\(4px, 0, 0\)/);
  assert.match(source, /safe-sheet-enter 260ms/);
  assert.match(source, /translate3d\(0, 7px, 0\)/);
  assert.doesNotMatch(source, /startViewTransition/);
});
