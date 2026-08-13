import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const [html, entry, css] = await Promise.all([
  read("index.html"),
  read("src/features-v3.mjs"),
  read("src/ui-system.css")
]);

test("presentation is loaded from one semantic system stylesheet", () => {
  assert.match(html, /src\/ui-system\.css/);
  assert.match(html, /data-ui-system/);
  assert.match(html, /<body class="app-booting ui-system">/);
  assert.doesNotMatch(html, /data-ui-v1[0-6]|data-ui-current/);
  assert.doesNotMatch(html, /src\/ui-v1[0-6]\.css|src\/ui-current\.css/);
  assert.doesNotMatch(css, /@import\s/);
});

test("presentation scope is declared by markup instead of runtime normalization", () => {
  assert.match(html, /<body class="app-booting ui-system">/);
  assert.doesNotMatch(entry, /LEGACY_PRESENTATION_SCOPES|normalizePresentationScope|body\.classList\.add\("ui-system"\)|body\.classList\.remove/);
  assert.doesNotMatch(css, /body\.ui-v\d+|body\.ui-current/);
  assert.match(css, /body\.ui-system/);
});

test("topbar has one stable current geometry", () => {
  assert.match(css, /body\.ui-system \.topbar \{[\s\S]*min-height:\s*68px !important/);
  assert.match(css, /body\.ui-system \.topbar \{[\s\S]*background:\s*#F8F8FA !important/);
  assert.match(css, /body\.ui-system \.topbar \.brand-copy h1 \{[\s\S]*font-size:\s*20px !important[\s\S]*line-height:\s*1\.15 !important/);
  assert.match(css, /backdrop-filter:\s*none !important/);
});

test("bottom navigation has one floating material and one persistent glider", () => {
  assert.match(css, /body\.ui-system \.bottom-nav \{[\s\S]*position:\s*fixed !important/);
  assert.match(css, /width:\s*min\(calc\(100% - 20px\),\s*520px\) !important/);
  assert.match(css, /\.nav-glider-v15 \{[\s\S]*transform:\s*translate3d\(var\(--v15-nav-glider-x/);
  assert.match(css, /--ui-motion-choice:\s*280ms/);
});

test("search route editor has one composed-control geometry", () => {
  assert.match(css, /\.search-panel-compact \.route-editor \{[\s\S]*grid-template-columns:\s*minmax\(0,1fr\) 44px !important/);
  assert.match(css, /\.search-panel-compact \.route-line:first-child::after/);
  assert.match(css, /\.search-panel-compact \.swap-button \{[\s\S]*grid-row:\s*1 \/ span 2 !important/);
});

test("timetable selection material is below text and grouped list remains current", () => {
  assert.match(css, /#timetable-route-controls::before,[\s\S]*z-index:\s*1/);
  assert.match(css, /\.tt-campus-tabs > button,[\s\S]*z-index:\s*2 !important/);
  const trackBlock = css.match(/body\.ui-system \.tt-campus-tabs,[\s\S]*?box-shadow:[^\n]+\n}/)?.[0] || "";
  assert.doesNotMatch(trackBlock, /z-index:\s*0/);
  assert.match(css, /timetable-list\.timetable-group-v13[\s\S]*border-radius:\s*var\(--ui-radius-group\) !important/);
});

test("settings and install guide retain the current final presentation", () => {
  assert.match(css, /\.settings-menu-v13[\s\S]*box-shadow:\s*var\(--ui-shadow-soft\) !important/);
  assert.match(css, /\.settings-subpage-v13 \{[\s\S]*touch-action:\s*pan-y/);
  assert.match(css, /\.install-guide-media \{[\s\S]*aspect-ratio:\s*706 \/ 1536 !important/);
  assert.match(css, /\.install-guide-media\.is-low-res-source-v15 img/);
});

test("superseded boot and version animation rules are gone", () => {
  assert.doesNotMatch(css, /\.app-boot-inner|\.app-boot-mark|v13-boot-progress/);
  assert.doesNotMatch(css, /v6-view-enter|v15-view-enter/);
});

test("reduced motion and transparency remain explicit", () => {
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /prefers-reduced-transparency:\s*reduce/);
});
