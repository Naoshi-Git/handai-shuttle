import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const entry = await readFile(new URL("../src/features-v3.mjs", import.meta.url), "utf8");
const runtime = await readFile(new URL("../src/ui-runtime.mjs", import.meta.url), "utf8");
const css = await readFile(new URL("../src/ui-v14.css", import.meta.url), "utf8");
const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

await import("../src/ui-runtime.mjs");

test("v14 visual CSS remains preloaded while behavior is consolidated", () => {
  assert.doesNotMatch(entry, /import "\.\/ui-v14\.mjs";/);
  assert.match(entry, /import "\.\/ui-v13\.mjs";[\s\S]*import "\.\/ui-runtime\.mjs";/);
  assert.match(runtime, /"ui-v14"/);
  assert.match(html, /ui-v13\.css" data-ui-v13[\s\S]*ui-v14\.css" data-ui-v14/);
});

test("critical splash precedes legacy styles and hides the app shell", () => {
  const critical = html.indexOf('id="boot-critical"');
  const legacy = html.indexOf('href="./style.css"');
  assert.ok(critical >= 0 && critical < legacy);
  assert.match(html, /body\.app-booting \.app-shell\{opacity:0!important;visibility:hidden!important/);
});

test("radius hierarchy differentiates groups controls and pills", () => {
  assert.match(css, /--v14-radius-group:\s*22px/);
  assert.match(css, /--v14-radius-card:\s*20px/);
  assert.match(css, /--v14-radius-control:\s*16px/);
  assert.match(css, /--v14-radius-compact:\s*13px/);
  assert.match(css, /--v14-radius-pill:\s*999px/);
});

test("glass-like material stays on navigation and control layers", () => {
  assert.match(css, /\.bottom-nav[\s\S]*backdrop-filter:\s*blur\(22px\)/);
  assert.match(css, /\.topbar[\s\S]*backdrop-filter:\s*blur\(18px\)/);
  assert.match(css, /\.settings-subpage-header[\s\S]*backdrop-filter:\s*blur\(20px\)/);
  assert.match(css, /prefers-reduced-transparency/);
});

test("bottom navigation establishes the rounded floating base refined by runtime", () => {
  assert.match(css, /\.bottom-nav[\s\S]*width:\s*min\(calc\(100% - 20px\), 520px\)/);
  assert.match(css, /\.bottom-nav[\s\S]*border-radius:\s*30px/);
  assert.match(css, /\.bottom-nav button[\s\S]*min-height:\s*48px/);
});

test("timetable uses one rounded group and runtime owns the short next-bus label", () => {
  assert.match(css, /timetable-list\.timetable-group-v13[\s\S]*border-radius:\s*var\(--v14-radius-group\)/);
  assert.match(css, /left:\s*16px;[\s\S]*right:\s*16px;[\s\S]*background:\s*var\(--v14-line-soft\)/);
  assert.match(runtime, /textContent\.trim\(\) !== "次の便"/);
  assert.match(runtime, /node\.textContent = "次の便"/);
});

test("settings retain slide navigation while using rounded groups", () => {
  assert.match(css, /\.settings-menu-v13[\s\S]*border-radius:\s*var\(--v14-radius-group\)/);
  assert.match(css, /\.settings-subpage-v13/);
  assert.match(css, /\.settings-subpage-back[\s\S]*var\(--v14-radius-pill\)/);
});
