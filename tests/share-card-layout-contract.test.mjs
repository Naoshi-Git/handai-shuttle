import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("shared journey image keeps one metadata baseline and no fake image CTA", async () => {
  const source = await read("src/share-card.mjs");

  assert.doesNotMatch(source, /阪大シャトルを開く/);
  assert.match(source, /const pillY = 562/);
  assert.match(source, /drawPill\(ctx, routeType, pillX, pillY/);
  assert.match(source, /drawPill\(ctx, safeText\(data\.duration\), pillX, pillY/);
  assert.ok((source.match(/pillX, pillY/g) || []).length >= 3);
});

test("share panel distinguishes image sharing from link-only copying", async () => {
  const source = await read("src/share-card.mjs");

  assert.match(source, /便情報を画像で共有できます。/);
  assert.match(source, />画像を共有<\/button>/);
  assert.match(source, />リンクだけコピー<\/button>/);
});
