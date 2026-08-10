import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const entry = await readFile(new URL("../src/features-v3.mjs", import.meta.url), "utf8");
const source = await readFile(new URL("../src/ui-v12.mjs", import.meta.url), "utf8");
const css = await readFile(new URL("../src/ui-v12.css", import.meta.url), "utf8");
const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

await import("../src/ui-v12.mjs");

test("v12 remains a functional layer before v13 and the consolidated runtime", () => {
  assert.match(entry, /import "\.\/ui-v10\.mjs";[\s\S]*import "\.\/ui-v12\.mjs";[\s\S]*import "\.\/ui-v13\.mjs";[\s\S]*import "\.\/ui-runtime\.mjs";/);
});

test("final presentation CSS is linked in head before modules run", () => {
  assert.match(html, /ui-v4\.css" data-ui-v4/);
  assert.match(html, /ads\.css" data-ads-ui/);
  assert.match(html, /ui-v11\.css" data-ui-v11/);
  assert.match(html, /ui-v12\.css" data-ui-v12/);
  assert.match(html, /class="app-boot"/);
  assert.match(html, /brand-icon-rounded\.svg/);
});

test("legacy refresh is hidden and boot layer prevents FOUC", () => {
  assert.match(css, /#refresh-button[\s\S]*display:\s*none/);
  assert.match(css, /body\.app-booting \.app-shell[\s\S]*opacity:\s*0/);
  assert.match(source, /finishBoot\(\)/);
});

test("bottom navigation is fixed, compact, and guarded for landscape/desktop", () => {
  assert.match(css, /\.bottom-nav[\s\S]*position:\s*fixed !important/);
  assert.match(css, /min-height:\s*46px !important/);
  assert.match(css, /min-width:\s*760px[\s\S]*max-height:\s*599px/);
  assert.match(css, /\.bottom-nav::after[\s\S]*height:\s*28px/);
});

test("manual campus selection explicitly drives location status", () => {
  assert.match(source, /LOCATION_SOURCE_KEY/);
  assert.match(source, /data-campus-choice/);
  assert.match(source, /setManualLocationState/);
  assert.match(source, /dataset\.locationState = "manual"/);
});

test("timetable next-bus cue is stronger without a selected blue frame", () => {
  assert.match(source, /次の便/);
  assert.match(css, /\.route-timetable-card:focus-visible[\s\S]*outline:\s*0/);
  assert.match(css, /\.is-next::before[\s\S]*width:\s*2px/);
});

test("timetable advertisements are integrated and detail sheet gets a footer ad", () => {
  assert.match(css, /\.ad-slot-timetable-inline[\s\S]*margin:\s*0 !important/);
  assert.match(css, /\.ad-slot-timetable-header[\s\S]*margin:\s*0 !important/);
  assert.match(source, /ad-slot-timetable-detail/);
  assert.match(source, /ensureDetailAd/);
});

test("settings use disclosures while favorites and searches remain visible", () => {
  assert.match(source, /settings-disclosure/);
  assert.match(source, /favorite-trips-v6/);
  assert.match(source, /saved-searches-v6/);
  assert.match(css, /\.settings-disclosure > summary/);
});

test("home-screen install guide is built for real screenshot assets", () => {
  assert.match(source, /ios-01-share\.webp/);
  assert.match(source, /ios-02-add-home\.webp/);
  assert.match(source, /ios-03-confirm\.webp/);
  assert.match(css, /scroll-snap-type:\s*x mandatory/);
});
