import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const [entry, v5, v10, v12, v13, current] = await Promise.all([
  read("src/features-v3.mjs"),
  read("src/ui-v5.mjs"),
  read("src/ui-v10.mjs"),
  read("src/ui-v12.mjs"),
  read("src/ui-v13.mjs"),
  read("src/ui-current.mjs")
]);

test("removed compatibility owners cannot silently re-enter the active graph", () => {
  for (const removed of ["ui-v7-fixes", "ui-v9.mjs", "ui-runtime", "ui-safe-fixes", "ui-v11.mjs", "ui-v14.mjs", "ui-v15.mjs", "ui-v16.mjs"]) {
    assert.doesNotMatch(entry, new RegExp(removed.replaceAll(".", "\\.")));
  }
});

test("presentation layers do not observe document.body or the whole app shell", () => {
  for (const source of [v5, v10, v12, v13, current]) {
    assert.doesNotMatch(source, /observe\(document\.body/);
    assert.doesNotMatch(source, /const root = \$\("\.app-shell"\)[\s\S]{0,300}\.observe\(root/);
  }
});

test("dynamic observers use narrow mutation contracts", () => {
  assert.doesNotMatch(v5, /attributeFilter:\s*\["class"\]/);
  assert.doesNotMatch(v10, /attributes:\s*true/);
  assert.doesNotMatch(v12, /attributeFilter:\s*\["class",\s*"open"\]/);
  assert.doesNotMatch(v13, /attributes:\s*true/);
});

test("lazy timetable detail integration is event driven instead of body watched", () => {
  assert.match(v12, /bindDetailSheetLifecycle/);
  assert.match(v12, /#timetable-list \[data-tt-trip\]/);
  assert.match(v12, /detailSheetObserver\.observe\(dialog/);
});

test("current UI remains the last presentation and interaction owner", () => {
  const currentIndex = entry.lastIndexOf('import "./ui-current.mjs";');
  assert.ok(currentIndex >= 0);
  assert.equal(entry.slice(currentIndex).trim(), 'import "./ui-current.mjs";');
});
