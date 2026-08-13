import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("sharing snapshots the live UI instead of redrawing a parallel card", async () => {
  const source = await read("src/share-card.mjs");

  assert.match(source, /snapshotElementToPng/);
  assert.match(source, /openSharePreview\(data, target/);
  assert.match(source, /表示中のカードを、そのまま画像で共有します。/);
  assert.doesNotMatch(source, /drawBrandMark/);
  assert.doesNotMatch(source, /createElement\(["']canvas["']\)/);
  assert.doesNotMatch(source, /fillText\(/);
});

test("DOM snapshot engine is pinned and includes Safari warmup", async () => {
  const source = await read("src/dom-snapshot.mjs");

  assert.match(source, /@zumer\/snapdom@2\.8\.0/);
  assert.match(source, /safariWarmupAttempts:\s*4/);
  assert.match(source, /scale/);
  assert.match(source, /toBlob\(\{ type: "png" \}\)/);
});

test("share panel distinguishes image sharing from link-only copying", async () => {
  const source = await read("src/share-card.mjs");

  assert.match(source, />画像を共有<\/button>/);
  assert.match(source, />リンクだけコピー<\/button>/);
  assert.match(source, /表示中の阪大シャトルUIのスナップショット/);
});
