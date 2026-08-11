import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const [entry, html, systemCss, v5, ads, v12, v13, current] = await Promise.all([
  read("src/features-v3.mjs"),
  read("index.html"),
  read("src/ui-system.css"),
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
  assert.doesNotMatch(html, /src\/ui-v1[0-6]\.css|src\/ui-current\.css/);
  assert.match(entry, /classList\.add\("ui-system"\)/);
  assert.match(entry, /classList\.remove\(\.\.\.LEGACY_PRESENTATION_SCOPES\)/);
  assert.doesNotMatch(systemCss, /body\.ui-v\d+|body\.ui-current/);
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
