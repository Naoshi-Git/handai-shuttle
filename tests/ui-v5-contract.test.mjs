import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../src/ui-v5.mjs", import.meta.url), "utf8");
const css = await readFile(new URL("../ui-v5.css", import.meta.url), "utf8");

test("contextual header uses the active tab title and hides duplicate page headings", () => {
  assert.match(source, /search:\s*\{\s*eyebrow:\s*"ROUTE SEARCH",\s*title:\s*"ルート検索"/);
  assert.match(source, /timetable:\s*\{\s*eyebrow:\s*"TIMETABLE",\s*title:\s*"時刻表"/);
  assert.match(css, /#view-search > \.page-heading/);
  assert.match(css, /#view-timetable > \.page-heading/);
});

test("search date-time and detailed conditions are moved into dedicated bottom sheets", () => {
  assert.match(source, /search-timing-sheet/);
  assert.match(source, /search-condition-sheet/);
  assert.match(source, /timingBody\.append\(nowButton, mode, dateTime\)/);
  assert.match(source, /conditionBody\.append\(options\)/);
  assert.match(css, /\.search-sheet\s*\{/);
});

test("search page moves the service banner below the search button and fixes weekend Japanese", () => {
  assert.match(source, /submit\.insertAdjacentElement\("afterend", banner\)/);
  assert.match(source, /本日は土・日曜日のため運休です。通常時刻表のみ表示しています。/);
  assert.match(source, /は土・日曜日のため運休です。/);
});

test("timetable and search metadata use fixed columns so route label length does not shift crowding/date", () => {
  assert.match(css, /\.tt-compact-badges\.tt-compact-badges-v5/);
  assert.match(css, /grid-template-columns:\s*42px 58px/);
  assert.match(css, /#search-results \.journey-details\.journey-details-v5/);
  assert.match(css, /grid-template-columns:\s*42px 70px 68px/);
});

test("timetable selector is offset below the sticky ad stack", () => {
  assert.match(css, /#timetable-route-controls[\s\S]*var\(--tt-sticky-ad-height/);
});
