import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const entry = await readFile(new URL("../src/features-v3.mjs", import.meta.url), "utf8");
const current = await readFile(new URL("../src/ui-current.mjs", import.meta.url), "utf8");
const currentCss = await readFile(new URL("../src/ui-current.css", import.meta.url), "utf8");
const lifecycle = await readFile(new URL("../src/view-lifecycle.mjs", import.meta.url), "utf8");
const lifecycleCss = await readFile(new URL("../src/view-lifecycle.css", import.meta.url), "utf8");

await import("../src/ui-current.mjs");
await import("../src/view-lifecycle.mjs");

test("legacy behavior version modules are inactive and ui-current is the final behavior import", () => {
  assert.doesNotMatch(entry, /ui-v7-fixes|ui-v9\.mjs|ui-runtime|ui-safe-fixes|ui-v10\.mjs|ui-v11\.mjs|ui-v14\.mjs|ui-v15\.mjs|ui-v16\.mjs/);
  const imports = [...entry.matchAll(/import\s+"([^"]+)";/g)].map((match) => match[1]);
  assert.equal(imports.at(-2), "./view-lifecycle.mjs");
  assert.equal(imports.at(-1), "./ui-current.mjs");
});

test("current motion avoids full-document snapshots and recreated child gliders", () => {
  assert.doesNotMatch(current, /startViewTransition/);
  assert.doesNotMatch(lifecycle, /startViewTransition/);
  assert.doesNotMatch(currentCss, /::view-transition/);
  assert.doesNotMatch(current, /runtime-choice-glider/);
  assert.match(currentCss, /#home-destination-chips::before/);
  assert.match(currentCss, /#timetable-route-controls::before/);
  assert.match(currentCss, /#timetable-route-controls::after/);
});

test("current owner keeps material visual scopes without importing their behavior modules", () => {
  assert.match(current, /classList\.add\("ui-v11", "ui-v14", "ui-v15", "ui-current"\)/);
});

test("current observers are targeted to stable UI surfaces", () => {
  assert.doesNotMatch(current, /observe\(document\.body/);
  assert.doesNotMatch(current, /observe\([^\n]*\.app-shell/);
  assert.match(current, /observe\(home, \{ childList: true \}\)/);
  assert.match(current, /observe\(timetable, \{ childList: true \}\)/);
  assert.match(current, /favoriteObserver\.observe\(section/);
});

test("ordinary tab motion freezes outgoing viewport geometry and dissolves title with content", () => {
  assert.match(lifecycle, /freezeOutgoingView\(outgoing\)/);
  assert.match(lifecycle, /prepareHeaderTransition\(\)/);
  assert.match(lifecycle, /prepareServiceBannerTransition\(fromView, view\)/);
  assert.match(lifecycleCss, /view-crossfade-leaving[\s\S]*position:\s*fixed !important/);
  assert.match(lifecycleCss, /--view-crossfade-top/);
  assert.match(lifecycleCss, /view-header-copy-ghost/);
  assert.match(lifecycleCss, /--view-dissolve-out:\s*145ms/);
  assert.match(lifecycleCss, /--view-dissolve-in:\s*185ms/);
  assert.match(lifecycleCss, /\.bottom-nav[\s\S]*z-index:\s*60 !important/);
  assert.doesNotMatch(lifecycleCss, /view-transition-veil/);
  assert.doesNotMatch(currentCss, /current-view-enter|--current-motion-view/);
  assert.match(currentCss, /current-sheet-in/);
  assert.match(currentCss, /current-backdrop-in/);
  assert.match(currentCss, /--current-motion-choice:\s*280ms/);
  assert.match(currentCss, /--current-motion-sheet:\s*360ms/);
});

test("timetable transition alone waits for DOM and scroll to settle behind a content loader", () => {
  assert.match(lifecycle, /waitForTimetableDomQuiet/);
  assert.match(lifecycle, /waitForScrollIdle/);
  assert.match(lifecycle, /view === "timetable"/);
  assert.match(lifecycle, /MutationObserver/);
  assert.match(lifecycle, /scrollStableFrames/);
  assert.match(lifecycleCss, /timetable-transition-loader/);
  assert.match(lifecycle, /event\.preventDefault\(\);\s*event\.stopPropagation\(\)/);
  assert.doesNotMatch(lifecycle, /stopImmediatePropagation/);
  assert.doesNotMatch(lifecycle, /\.click\(\)/);
  assert.doesNotMatch(lifecycle, /pointerdown/);
});

test("desktop containment and reduced-motion fallbacks remain available", () => {
  assert.match(currentCss, /@media \(min-width: 760px\)/);
  assert.match(currentCss, /width:\s*min\(520px,calc\(100vw - 48px\)\)/);
  assert.match(currentCss, /prefers-reduced-motion:\s*reduce/);
  assert.match(lifecycleCss, /prefers-reduced-motion:\s*reduce/);
});
