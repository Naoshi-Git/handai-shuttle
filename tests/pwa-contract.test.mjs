import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../src/pwa.mjs", import.meta.url), "utf8");
const manifest = await readFile(new URL("../manifest.webmanifest", import.meta.url), "utf8");

await import("../src/pwa.mjs");

test("PWA settings explain home-screen installation and preview scope", () => {
  assert.match(source, /ホーム画面に追加/);
  assert.match(source, /Safariの共有ボタン/);
  assert.match(source, /PR Preview/);
  assert.match(source, /正式利用は本番URL公開後/);
});

test("standalone app checks deploy version without relying on a service worker", () => {
  assert.match(source, /version\.json/);
  assert.match(source, /cache:\s*"no-store"/);
  assert.match(source, /cache:\s*"reload"/);
  assert.match(source, /display-mode:\s*standalone/);
  assert.doesNotMatch(source, /serviceWorker\.register/);
});

test("manifest keeps a relative start URL so preview and production remain scoped separately", () => {
  const parsed = JSON.parse(manifest);
  assert.equal(parsed.start_url, "./");
  assert.equal(parsed.scope, "./");
  assert.equal(parsed.display, "standalone");
});
