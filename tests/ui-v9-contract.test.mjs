import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const entry = await readFile(new URL("../src/features-v3.mjs", import.meta.url), "utf8");
const source = await readFile(new URL("../src/ui-v9.mjs", import.meta.url), "utf8");
const css = await readFile(new URL("../ui-v9.css", import.meta.url), "utf8");

await import("../src/ui-v9.mjs");

test("v9 is loaded after the previous correction layers", () => {
  assert.match(entry, /import "\.\/ui-v7-fixes\.mjs";[\s\S]*import "\.\/ui-v9\.mjs";/);
});

test("location button uses fixed short states instead of inferred place names", () => {
  assert.match(source, /label = "認識済み"/);
  assert.match(source, /label = "測位中"/);
  assert.match(source, /label = "要確認"/);
  assert.match(source, /button\.dataset\.locationState/);
  assert.match(css, /#locate-button[\s\S]*max-width:\s*78px/);
});

test("Suita departure and arrival preferences are separated by valid timetable stops", () => {
  assert.match(source, /preferred-suita-origin-stop/);
  assert.match(source, /preferred-suita-destination-stop/);
  assert.match(source, /suita_human_sciences/);
  assert.match(source, /suita_convention/);
  assert.match(source, /人間科学部前は吹田発の乗車停留所/);
  assert.match(source, /吹田に着くとき/);
});

test("home search resolves Suita to a stop key instead of the campus default", () => {
  assert.match(source, /function campusStopKey/);
  assert.match(source, /const origin = campusStopKey\(originCampus, "origin"\)/);
  assert.match(source, /const destination = campusStopKey\(destinationCampus, "destination"\)/);
  assert.match(source, /endpointLabel\(destinationCampus, destination\)/);
});

test("search and timetable default from current campus and cached destination", () => {
  assert.match(source, /function syncSearchDefaults/);
  assert.match(source, /function syncTimetableDefaults/);
  assert.match(source, /ou-bus:last-destination-campus/);
  assert.match(source, /data-nav="search"/);
  assert.match(source, /data-nav="timetable"/);
});

test("semantic colors are desaturated and do not reuse generic yellow for closures", () => {
  assert.match(css, /--v9-operating-bg:\s*#F2F7F6/);
  assert.match(css, /--v9-via-bg:\s*#F6F3ED/);
  assert.match(css, /--v9-closed-bg:\s*#F8F3F1/);
  assert.match(css, /\.pill-warning[\s\S]*var\(--v9-via-bg\)/);
  assert.match(css, /\.service-banner\.is-closed[\s\S]*var\(--v9-closed-bg\)/);
});

test("ad edge repair outputs an opaque PNG and leaves rounding to one shell", () => {
  assert.match(source, /getContext\("2d", \{ alpha: false \}\)/);
  assert.match(source, /toDataURL\("image\/png"\)/);
  assert.match(source, /png-v9-opaque/);
  assert.match(css, /\.house-ad-card[\s\S]*overflow:\s*hidden/);
  assert.match(css, /clip-path:\s*none !important/);
  assert.match(css, /-webkit-mask-image:\s*none !important/);
  assert.match(css, /\.house-ad-creative img[\s\S]*object-fit:\s*cover !important/);
});
