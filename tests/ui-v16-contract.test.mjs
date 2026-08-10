import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const entry = await readFile(new URL("../src/features-v3.mjs", import.meta.url), "utf8");
const source = await readFile(new URL("../src/ui-runtime.mjs", import.meta.url), "utf8");
const css = await readFile(new URL("../src/ui-runtime.css", import.meta.url), "utf8");

await import("../src/ui-runtime.mjs");

test("presentation and motion ownership is consolidated after functional layers", () => {
  assert.match(entry, /import "\.\/ui-v13\.mjs";[\s\S]*import "\.\/ui-runtime\.mjs";/);
  assert.doesNotMatch(entry, /import "\.\/ui-v11\.mjs";/);
  assert.doesNotMatch(entry, /import "\.\/ui-v14\.mjs";/);
  assert.doesNotMatch(entry, /import "\.\/ui-v15\.mjs";/);
  assert.doesNotMatch(entry, /import "\.\/ui-v16\.mjs";/);
  assert.match(source, /classList\.add\("ui-v11", "ui-v14", "ui-v15", "ui-runtime"\)/);
});

test("mobile interaction motion avoids full-document snapshots", () => {
  assert.doesNotMatch(source, /startViewTransition/);
  assert.doesNotMatch(css, /::view-transition/);
  assert.match(css, /--runtime-motion-view:\s*240ms/);
  assert.match(css, /--runtime-motion-select:\s*280ms/);
  assert.match(css, /--runtime-motion-sheet:\s*230ms/);
  assert.match(css, /--runtime-motion-close:\s*170ms/);
});

test("home and timetable selectors share one cached moving selection material", () => {
  assert.match(source, /#home-destination-chips/);
  assert.match(source, /\.tt-campus-tabs/);
  assert.match(source, /\.tt-destination-buttons/);
  assert.match(source, /const choiceGeometry = new Map\(\)/);
  assert.match(source, /"timetable-origin"/);
  assert.match(source, /"timetable-destination"/);
  assert.match(source, /created && previous/);
  assert.match(css, /\.runtime-choice-glider[\s\S]*transition:transform var\(--runtime-motion-select\)/);
});

test("runtime observes only targeted structural and content surfaces", () => {
  assert.doesNotMatch(source, /observe\(document\.body/);
  assert.doesNotMatch(source, /observe\([^\n]*\.app-shell/);
  assert.doesNotMatch(source, /attributes:\s*true/);
  assert.match(source, /structuralObserver\.observe\(homeChoices, \{ childList: true \}\)/);
  assert.match(source, /structuralObserver\.observe\(timetableControls, \{ childList: true \}\)/);
  assert.match(source, /contentObserver\.observe\(root, \{ childList: true, subtree: true \}\)/);
});

test("navigation, sheets and timetable jumps use the consolidated motion grammar", () => {
  assert.match(source, /nav-glider-v15/);
  assert.match(source, /HTMLDialogElement\.prototype\.close/);
  assert.match(source, /smoothTimetableJump/);
  assert.match(css, /runtime-view-enter/);
  assert.match(css, /runtime-sheet-in/);
  assert.match(css, /runtime-backdrop-in/);
  assert.match(css, /runtime-jump-target/);
});

test("desktop containment and reduced-motion fallbacks remain available", () => {
  assert.match(css, /@media \(min-width:760px\)/);
  assert.match(css, /width:min\(520px,calc\(100vw - 48px\)\)/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css, /prefers-reduced-transparency:reduce/);
});
