import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../lp/index.html", import.meta.url), "utf8");
const refinements = await readFile(new URL("../lp/refinements.css", import.meta.url), "utf8");

test("LP loads the typography and slider refinement layer", () => {
  assert.match(html, /href="\.\/refinements\.css"/);
  assert.match(refinements, /\.headline-line\{display:block\}/);
  assert.match(refinements, /scroll-snap-type:inline mandatory/);
});

test("LP exposes swipeable use cases and transparent voice previews", () => {
  assert.match(html, /class="card-rail usecase-rail"/);
  assert.match(html, /class="card-rail voice-rail"/);
  assert.match(html, /正式な利用者レビューではなく、β版の利用シーンを表したコメント例です/);
  assert.match(html, /実際に使った感想・改善案を送る/);
});

test("LP headings use intentional semantic line breaks instead of incidental wrapping", () => {
  const lineCount = (html.match(/class="headline-line"/g) || []).length;
  assert.ok(lineCount >= 10, `expected at least 10 intentional headline lines, got ${lineCount}`);
  assert.doesNotMatch(html, /PDF時刻表から「自分が乗る便」を探す代わりに、開いた瞬間から次の便を。/);
});
