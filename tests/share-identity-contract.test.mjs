import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const identity = await readFile(new URL("../src/share-identity.mjs", import.meta.url), "utf8");
const ads = await readFile(new URL("../src/ads.mjs", import.meta.url), "utf8");
const v12 = await readFile(new URL("../src/ui-v12.mjs", import.meta.url), "utf8");
const shareCard = await readFile(new URL("../src/share-card.mjs", import.meta.url), "utf8");
const landing = await readFile(new URL("../share.html", import.meta.url), "utf8");
const manifest = JSON.parse(await readFile(new URL("../manifest.webmanifest", import.meta.url), "utf8"));

await import("../src/share-identity.mjs");

test("share identity uses the existing raster app icons", () => {
  assert.match(identity, /app-icon-32\.png/);
  assert.match(identity, /app-icon-180\.png/);
  assert.match(identity, /apple-touch-icon/);
  assert.match(identity, /share\.html/);
});

test("all native share entry points use the same app-identity landing URL", () => {
  for (const source of [ads, v12, shareCard]) {
    assert.match(source, /shareLandingUrl/);
    assert.match(source, /ensureShareIdentity/);
  }
});

test("share landing page exposes static icon metadata before JavaScript runs", () => {
  assert.match(landing, /rel="icon"[^>]*app-icon-32\.png/);
  assert.match(landing, /rel="apple-touch-icon"[^>]*app-icon-180\.png/);
  assert.match(landing, /property="og:image"[^>]*app-icon-180\.png/);
  assert.match(landing, /name="twitter:image"[^>]*app-icon-180\.png/);
});

test("manifest prefers the existing PNG app icon and retains scalable fallback", () => {
  assert.equal(manifest.icons[0].src, "./assets/brand/app-icon-180.png");
  assert.equal(manifest.icons[0].type, "image/png");
  assert.ok(manifest.icons.some((icon) => icon.src === "./assets/brand/app-icon.svg"));
});
