import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const [enhancements, v12] = await Promise.all([
  read("src/enhancements.mjs"),
  read("src/ui-v12.mjs")
]);

test("enhancement bootstrap cannot leave the splash screen stuck", () => {
  assert.match(enhancements, /function releaseBoot\(/);
  assert.match(enhancements, /watchdog-timeout/);
  assert.match(enhancements, /featureBundle\.catch/);
  assert.match(enhancements, /enhancement-bootstrap-error/);
  assert.match(enhancements, /feature-bundle-error/);

  const importIndex = enhancements.indexOf('const featureBundle = import("./features-v3.mjs")');
  const bootstrapIndex = enhancements.indexOf("bindEnhancements();", importIndex);
  assert.ok(importIndex >= 0 && bootstrapIndex > importIndex, "feature bundle must start before synchronous enhancement bootstrap");
});

test("legacy localStorage values are validated before rendering", () => {
  assert.match(enhancements, /VALID_CAMPUSES/);
  assert.match(enhancements, /VALID_SUITA_STOPS/);
  assert.match(enhancements, /VALID_CAMPUSES\.has\(stored\)/);
  assert.match(enhancements, /VALID_SUITA_STOPS\.has\(stored\)/);
});

test("normal boot lifecycle still owns the primary ready transition", () => {
  assert.match(v12, /function finishBoot\(/);
  assert.match(v12, /classList\.remove\("app-booting"\)/);
  assert.match(v12, /classList\.add\("app-ready"\)/);
  assert.match(v12, /window\.setTimeout\(finish, maximumMs\)/);
});
