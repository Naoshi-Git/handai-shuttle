import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../src/ui-v5.mjs", import.meta.url), "utf8");
const systemCss = await readFile(new URL("../src/ui-system.css", import.meta.url), "utf8");
const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

test("v5 behavior no longer owns or injects a stylesheet", () => {
  assert.doesNotMatch(source, /installStyles|ui-v5\.css|data-ui-v5/);
  assert.doesNotMatch(html, /ui-v5\.css|ui-foundation\.css/);
  assert.match(html, /src\/ui-system\.css/);
});

test("contextual header uses one Japanese title line while duplicate page headings stay hidden", () => {
  assert.match(source, /home:\s*"阪大シャトル"/);
  assert.match(source, /search:\s*"ルート検索"/);
  assert.match(source, /timetable:\s*"時刻表"/);
  assert.match(source, /settings:\s*"設定"/);
  assert.doesNotMatch(source, /eyebrow|ROUTE SEARCH|TIMETABLE|SETTINGS/);
  assert.match(source, /\.topbar \.brand-copy h1/);
  assert.match(systemCss, /#view-search > \.page-heading/);
  assert.match(systemCss, /#view-timetable > \.page-heading/);
  assert.match(systemCss, /body\.ui-system \.topbar \.brand-copy h1/);
});

test("search date-time and detailed conditions are moved into dedicated bottom sheets", () => {
  assert.match(source, /search-timing-sheet/);
  assert.match(source, /search-condition-sheet/);
  assert.match(source, /timingBody\.append\(nowButton, mode, dateTime\)/);
  assert.match(source, /conditionBody\.append\(options\)/);
  assert.match(systemCss, /\.search-sheet\s*\{/);
});

test("search keeps the service banner in the shared app slot instead of below the form", () => {
  assert.match(source, /restoreServiceBanner\(\);/);
  assert.doesNotMatch(source, /moveServiceBannerToSearch|insertAdjacentElement\("afterend", banner\)/);
  assert.doesNotMatch(source, /normalizeJapaneseText|normalizeStatusCopy/);
  assert.doesNotMatch(source, /土日には運行しません|運行しませんのため/);
});

test("timetable and search metadata use fixed columns so route label length does not shift crowding/date", () => {
  assert.match(systemCss, /\.tt-compact-badges\.tt-compact-badges-v5/);
  assert.match(systemCss, /grid-template-columns:\s*42px 58px/);
  assert.match(systemCss, /#search-results \.journey-details\.journey-details-v5/);
  assert.match(systemCss, /grid-template-columns:\s*42px 70px 68px/);
});

test("timetable selector is offset below the sticky ad stack", () => {
  assert.match(systemCss, /#timetable-route-controls[\s\S]*var\(--tt-sticky-ad-height/);
});

test("v5 observes only owned dynamic surfaces instead of the whole app shell", () => {
  assert.match(source, /observeSurface\(\$\("#search-results"\)/);
  assert.match(source, /observeSurface\(\$\("#timetable-list"\)/);
  assert.doesNotMatch(source, /observeSurface\(\$\("#service-banner"\)/);
  assert.doesNotMatch(source, /characterData:\s*true/);
  assert.doesNotMatch(source, /observe\(root, \{[\s\S]*attributeFilter:\s*\["class"\]/);
  assert.doesNotMatch(source, /const root = \$\("\.app-shell"\)/);
});
