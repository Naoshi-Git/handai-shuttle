import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const entry = await readFile(new URL("../src/features-v3.mjs", import.meta.url), "utf8");
const source = await readFile(new URL("../src/ui-v16.mjs", import.meta.url), "utf8");
const css = await readFile(new URL("../src/ui-v16.css", import.meta.url), "utf8");

await import("../src/ui-v16.mjs");

test("v16 loads after v15", () => {
  assert.match(entry, /import "\.\/ui-v15\.mjs";[\s\S]*import "\.\/ui-v16\.mjs";/);
});

test("v16 uses progressive View Transitions for primary state changes", () => {
  assert.match(source, /document\.startViewTransition/);
  assert.match(source, /#search-now-button/);
  assert.match(source, /#arrival-search-button/);
  assert.match(source, /\.bottom-nav \[data-nav\]/);
  assert.match(source, /\[data-result-step\]/);
  assert.match(css, /view-transition-name:\s*app-view/);
  assert.match(css, /::view-transition-old\(app-view\)/);
  assert.match(css, /prefers-reduced-motion/);
});

test("navigation material is compositor clipped without an external rectangle shadow", () => {
  assert.match(css, /\.bottom-nav[\s\S]*box-shadow:\s*none\s*!important/);
  assert.match(css, /\.bottom-nav[\s\S]*overflow:\s*clip\s*!important/);
  assert.match(css, /\.bottom-nav[\s\S]*contain:\s*paint\s*!important/);
  assert.match(css, /clip-path:\s*inset\(0 round 30px\)/);
  assert.match(css, /\.bottom-nav::before,[\s\S]*\.bottom-nav::after[\s\S]*display:none/);
});

test("segmented controls share one moving selection material", () => {
  assert.match(source, /\.tt-campus-tabs, \.segmented/);
  assert.match(source, /v16-choice-glider/);
  assert.match(css, /\.v16-choice-glider[\s\S]*transition:\s*transform/);
});

test("route roles are optically left aligned and stepper is grouped", () => {
  assert.match(css, /\.route-role\.is-origin,[\s\S]*justify-content:flex-start/);
  assert.match(css, /\.result-stepper[\s\S]*border-radius:18px/);
  assert.match(source, /前の便/);
  assert.match(source, /次の便/);
});

test("bottom sheets dialogs and timetable jumps use unified motion", () => {
  assert.match(source, /HTMLDialogElement\.prototype\.close/);
  assert.match(css, /v16-sheet-in/);
  assert.match(css, /v16-backdrop-in/);
  assert.match(source, /smoothTimetableJump/);
  assert.match(source, /visibleTimetableViewport/);
  assert.match(css, /v16-jump-target/);
});

test("desktop sheets and settings stay inside the application surface", () => {
  assert.match(css, /@media \(min-width:760px\)/);
  assert.match(css, /width:min\(520px, calc\(100vw - 48px\)\)/);
  assert.match(css, /\.settings-subpage-v13[\s\S]*border-radius:24px/);
});

test("v16 keeps touch interactions off full-document snapshots and avoids broad attribute observation", () => {
  assert.match(source, /\(hover: hover\) and \(pointer: fine\)/);
  assert.match(source, /const NATIVE_TRANSITION_SELECTOR = "\.bottom-nav \[data-nav\]"/);
  assert.doesNotMatch(source, /startViewTransition\(async/);
  assert.doesNotMatch(source, /await\s+(?:nextFrame|delay)/);
  assert.doesNotMatch(source, /observer\.observe\(root,\s*\{[^}]*attributes:\s*true/s);
  assert.match(source, /observer\.observe\(root, \{ childList: true, subtree: true \}\)/);
});
