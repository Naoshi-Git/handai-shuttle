import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const [entry, html, systemCss, baseCss, v5, ads, v12, v13, current] = await Promise.all([
  read("src/features-v3.mjs"),
  read("index.html"),
  read("src/ui-system.css"),
  read("style.css"),
  read("src/ui-v5.mjs"),
  read("src/ads.mjs"),
  read("src/ui-v12.mjs"),
  read("src/ui-v13.mjs"),
  read("src/ui-current.mjs")
]);

test("removed compatibility behavior owners cannot silently re-enter the active graph", () => {
  for (const removed of ["ui-v7-fixes", "ui-v9.mjs", "ui-runtime", "ui-safe-fixes", "ui-v10.mjs", "ui-v11.mjs", "ui-v14.mjs", "ui-v15.mjs", "ui-v16.mjs"]) {
    assert.doesNotMatch(entry, new RegExp(removed.replaceAll(".", "\\.")));
  }
});

test("presentation has one semantic authority instead of version stylesheet stacking", () => {
  assert.match(html, /src\/ui-system\.css/);
  assert.doesNotMatch(html, /ui-v5\.css|ui-foundation\.css|src\/ui-v1[0-6]\.css|src\/ui-current\.css/);
  assert.match(entry, /classList\.add\("ui-system"\)/);
  assert.match(entry, /classList\.remove\(\.\.\.LEGACY_PRESENTATION_SCOPES\)/);
  assert.match(entry, /"ui-v5"/);
  assert.match(entry, /"ui-v6"/);
  assert.doesNotMatch(systemCss, /body\.ui-v\d+|body\.ui-current/);
});

test("structural compatibility rules are absorbed into ui-system", () => {
  assert.doesNotMatch(v5, /installStyles|ui-v5\.css|classList\.add\("ui-v5"\)/);
  assert.match(systemCss, /body\.ui-system\[data-active-view="search"\]/);
  assert.match(systemCss, /body\.ui-system #search-form #service-banner\.is-search-context/);
  assert.match(systemCss, /body\.ui-system #timetable-route-controls/);
  assert.match(systemCss, /body\.ui-system \.journey-card\.is-favorite-trip/);
});

test("absorbed compatibility layer keeps only live utility tokens and delegates sheet motion to current owner", () => {
  for (const removed of ["--ui-card-radius", "--ui-panel-radius", "--ui-warning-bg", "--ui-warning-border", "--ui-warning-ink"]) {
    assert.doesNotMatch(systemCss, new RegExp(removed));
  }
  assert.doesNotMatch(systemCss, /search-sheet-in/);
  assert.match(systemCss, /body\.ui-system \.search-sheet\[open\]/);
  assert.match(systemCss, /@keyframes ui-sheet-in/);
});

test("base stylesheet does not retain superseded first-generation Search markup", () => {
  for (const obsolete of ["eyebrow", "route-fields", "field-card", "detail-stop-row", "sub-field"]) {
    assert.doesNotMatch(baseCss, new RegExp(`\\.${obsolete}(?![\\w-])`));
  }
  assert.match(html, /class="route-editor"/);
  assert.match(html, /class="route-line"/);
});

test("Bottom Navigation presentation no longer has a ui-v6 owner", () => {
  assert.doesNotMatch(systemCss, /body\.ui-v6 \.bottom-nav/);
  assert.match(systemCss, /body\.ui-system \.bottom-nav \{/);
  assert.match(systemCss, /body\.ui-system \.bottom-nav button \{/);
  assert.match(systemCss, /prefers-reduced-motion:[\s\S]*body\.ui-system \.bottom-nav button/);
});

test("semantic system owns final surfaces and status colors without version restatements", () => {
  assert.doesNotMatch(systemCss, /body\.ui-v6 \.search-panel|body\.ui-v6 \.settings-card|body\.ui-v6 \.pill-warning|body\.ui-v6 \.service-banner\.is-closed/);
  assert.doesNotMatch(systemCss, /@keyframes favorite-flash|route-timetable-card\.favorite-flash\s*\{\s*animation/);
  assert.match(systemCss, /body\.ui-system \.search-panel[\s\S]*border:\s*0 !important/);
  assert.match(systemCss, /body\.ui-system \.settings-card[\s\S]*border:\s*0 !important/);
  assert.match(systemCss, /body\.ui-system \.pill-warning/);
  assert.match(systemCss, /body\.ui-system \.service-banner\.is-closed/);
  assert.match(systemCss, /route-timetable-card\.favorite-flash[\s\S]*animation:\s*none !important/);
});

test("presentation layers do not observe document.body or the whole app shell", () => {
  for (const source of [v5, ads, v12, v13, current]) {
    assert.doesNotMatch(source, /observe\(document\.body/);
    assert.doesNotMatch(source, /const root = \$\("\.app-shell"\)[\s\S]{0,300}\.observe\(root/);
  }
});

test("dynamic observers use narrow mutation contracts", () => {
  assert.doesNotMatch(v5, /attributeFilter:\s*\["class"\]/);
  assert.doesNotMatch(ads, /attributes:\s*true/);
  assert.doesNotMatch(v12, /attributeFilter:\s*\["class",\s*"open"\]/);
  assert.doesNotMatch(v13, /attributes:\s*true/);
});

test("lazy timetable detail integration is event driven instead of body watched", () => {
  assert.match(v12, /bindDetailSheetLifecycle/);
  assert.match(v12, /#timetable-list \[data-tt-trip\]/);
  assert.match(v12, /detailSheetObserver\.observe\(dialog/);
});

test("current UI remains the last imported presentation and interaction owner", () => {
  const imports = [...entry.matchAll(/import\s+"([^"]+)";/g)].map((match) => match[1]);
  assert.equal(imports.at(-1), "./ui-current.mjs");
});

test("current observers stay targeted to stable UI surfaces", () => {
  assert.doesNotMatch(current, /observe\(document\.body/);
  assert.doesNotMatch(current, /observe\([^\n]*\.app-shell/);
  assert.match(current, /observe\(home, \{ childList: true \}\)/);
  assert.match(current, /observe\(timetable, \{ childList: true \}\)/);
  assert.match(current, /favoriteObserver\.observe\(section/);
});
