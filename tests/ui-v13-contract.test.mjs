import test from "node:test";
import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";

const entry = await readFile(new URL("../src/features-v3.mjs", import.meta.url), "utf8");
const source = await readFile(new URL("../src/ui-v13.mjs", import.meta.url), "utf8");
const css = await readFile(new URL("../src/ui-v13.css", import.meta.url), "utf8");

await import("../src/ui-v13.mjs");

test("v13 is loaded after v12 and before ui-current", () => {
  assert.match(entry, /import "\.\/ui-v12\.mjs";[\s\S]*import "\.\/ui-v13\.mjs";[\s\S]*import "\.\/ui-current\.mjs";/);
});

test("boot is richer without replacing the product icon", () => {
  assert.match(css, /\.app-boot-inner[\s\S]*border-radius:\s*24px/);
  assert.match(css, /\.app-boot-mark[\s\S]*border-radius:\s*18px/);
  assert.match(css, /v13-boot-progress/);
});

test("timetable uses a rounded grouped list instead of detached square rows", () => {
  assert.match(source, /timetable-group-v13/);
  assert.match(css, /timetable-group-v13[\s\S]*border-radius:\s*18px/);
  assert.match(css, /timetable-group-v13 > \.route-timetable-card[\s\S]*border-radius:\s*0 !important/);
});

test("settings configuration opens as a horizontal subpage with swipe back", () => {
  assert.match(source, /settings-subpage-v13/);
  assert.match(source, /installSwipeBack/);
  assert.match(source, /event\.clientX > 52/);
  assert.match(css, /settings-subpage-v13[\s\S]*translateX\(calc\(-50% \+ 100%\)\)/);
  assert.match(css, /settings-menu-v13[\s\S]*border-radius:\s*18px/);
});

test("legacy saved routes UI is removed in favor of search conditions and favorite trips", () => {
  assert.match(source, /removeLegacySavedRoutesUi/);
  assert.match(source, /保存したルート/);
  assert.match(source, /saved-searches-v6/);
  assert.match(source, /favorite-trips-v6/);
});

test("install guide is wired for the supplied real screenshots", async () => {
  await access(new URL("../assets/help/install/ios-01-share.webp", import.meta.url));
  await access(new URL("../assets/help/install/ios-02-add-home.webp", import.meta.url));
  await access(new URL("../assets/help/install/ios-03-confirm.webp", import.meta.url));
  assert.match(css, /aspect-ratio:\s*706 \/ 1536/);
});
