import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v3互換entry pointからv4 UIが読み込まれる", async () => {
  const wrapper = await read("src/features-v3.mjs");
  assert.match(wrapper, /features-v3-core\.mjs/);
  assert.match(wrapper, /ui-v4\.mjs/);
});

test("ホームの次便重複を除外するcontractを保持する", async () => {
  const source = await read("src/ui-v4.mjs");
  assert.match(source, /removeFeaturedDuplicate/);
  assert.match(source, /#next-card-content \.next-times/);
  assert.match(source, /#upcoming-list/);
});

test("トップのメタ情報は重複route tagを除き1行表示を維持する", async () => {
  const source = await read("src/ui-v4.mjs");
  const css = await read("src/ui-system.css");
  assert.match(source, /compactNextMeta/);
  assert.match(source, /node\.textContent\.trim\(\) === topType/);
  assert.match(css, /next-meta\.next-meta-v4/);
  assert.match(css, /flex-wrap:nowrap/);
});

test("時刻表はcompact rowとdetail sheetを備える", async () => {
  const source = await read("src/ui-v4.mjs");
  const css = await read("src/ui-system.css");
  assert.match(source, /dataset\.v4Compact/);
  assert.match(source, /tt-detail-sheet/);
  assert.match(source, /showModal/);
  assert.match(css, /data-v4-compact/);
  assert.match(css, /tt-compact-row/);
  assert.match(css, /touch-action:manipulation/);
});

test("pre-compact timetable staging DOM carries data before semantic presentation", async () => {
  const source = await read("src/ui-v4.mjs");
  assert.match(source, /\.tt-route-caption/);
  assert.match(source, /\.stop-time/);
  assert.match(source, /card\.innerHTML = `[\s\S]*tt-compact-row/);
});

test("timetable tracks and compact scroll offset have one semantic CSS owner", async () => {
  const systemCss = await read("src/ui-system.css");
  assert.match(systemCss, /body\.ui-system \.tt-campus-tabs,[\s\S]*body\.ui-system \.tt-destination-buttons\s*\{[\s\S]*display:\s*grid\s*!important/);
  assert.match(systemCss, /body\.ui-system \.tt-campus-tabs\s*\{\s*grid-template-columns:\s*repeat\(3,minmax\(0,1fr\)\)\s*!important/);
  assert.match(systemCss, /body\.ui-system \.tt-destination-buttons\s*\{\s*grid-template-columns:\s*repeat\(2,minmax\(0,1fr\)\)\s*!important/);
  assert.match(systemCss, /body\.ui-system \.route-timetable-card\[data-v4-compact="true"\]\s*\{\s*scroll-margin-top:/);
});

test("compact timetable keeps geometry and final typography in the semantic system", async () => {
  const systemCss = await read("src/ui-system.css");
  assert.match(systemCss, /\.route-timetable-card\[data-v4-compact="true"\]\s*\{[^}]*padding-block:0!important/);
  assert.match(systemCss, /body\.ui-system #view-timetable \.route-timetable-card\[data-v4-compact="true"\]\s*\{\s*padding-inline:\s*14px\s*!important/);
  assert.match(systemCss, /body\.ui-system \.tt-compact-row\s*\{\s*grid-template-columns:\s*max-content minmax\(0,1fr\) 30px 12px/);
  assert.match(systemCss, /body\.ui-system \.tt-compact-time strong,[\s\S]*font-weight:\s*700\s*!important/);
  assert.match(systemCss, /body\.ui-system \.tt-compact-chevron\s*\{[\s\S]*font-size:\s*0\s*!important/);
});

test("detail sheet motion is owned by the semantic system", async () => {
  const systemCss = await read("src/ui-system.css");
  assert.match(systemCss, /body\.ui-system \.tt-detail-sheet\[open\]/);
  assert.match(systemCss, /@keyframes ui-sheet-in/);
});

test("sheet and share dialog radii are owned by the semantic system", async () => {
  const systemCss = await read("src/ui-system.css");
  assert.match(systemCss, /body\.ui-system \.search-sheet,[\s\S]*body\.ui-system \.tt-detail-sheet,[\s\S]*body\.ui-system \.share-card-dialog\s*\{\s*border-radius:/);
});

test("next-bus decoration is owned by the semantic system", async () => {
  const systemCss = await read("src/ui-system.css");
  assert.match(systemCss, /body\.ui-system #view-timetable \.route-timetable-card\[data-v4-compact="true"\]\.is-next/);
});

test("compact next badge visual styling is owned by the semantic system", async () => {
  const systemCss = await read("src/ui-system.css");
  assert.match(systemCss, /body\.ui-system \.tt-next-mini\s*\{/);
  assert.match(systemCss, /background:\s*rgba\(45,40,127,\.075\)\s*!important/);
});

test("share action geometry and surfaces are owned by the semantic system", async () => {
  const systemCss = await read("src/ui-system.css");
  assert.match(systemCss, /\.journey-share-button\s*\{[^}]*position:absolute/);
  assert.match(systemCss, /body\.ui-system \.journey-share-button,[\s\S]*body\.ui-system \.tt-sheet-share\s*\{[\s\S]*background:\s*#F4F4F6\s*!important/);
  assert.match(systemCss, /body\.ui-system \.share-card-primary\s*\{[\s\S]*background:\s*var\(--ou-900\)\s*!important/);
});

test("トップ・検索結果・時刻表では文字タグではなく人型混雑アイコンを使う", async () => {
  const source = await read("src/ui-v4.mjs");
  const css = await read("src/ui-system.css");
  assert.match(source, /function crowdingIcon/);
  assert.match(source, /crowding-person/);
  assert.match(source, /decorateNextCardCrowding/);
  assert.match(source, /#search-results \.journey-card/);
  assert.match(source, /tt-sheet-crowding/);
  assert.match(css, /\.crowding-icon/);
  assert.match(css, /\.crowding-person/);
  assert.match(css, /crowding-lv5/);
  assert.match(css, /\.next-meta \.crowding-person/);
});

test("混雑凡例のlabel selectorはsource CSSで閉じ、polish pathは副作用なしで互換保持する", async () => {
  const css = await read("src/ui-system.css");
  const polish = await read("src/ui-v4-polish.mjs");
  assert.match(css, /\.crowding-legend-item\s*>\s*span:last-child/);
  assert.doesNotMatch(css, /\.crowding-legend-item\s+span:last-child/);
  assert.match(polish, /UI_V4_POLISH_COMPAT/);
  assert.doesNotMatch(polish, /createElement\(["']style["']\)/);
  assert.doesNotMatch(polish, /style\.textContent/);
  assert.doesNotMatch(polish, /document\.head\.append/);
});

test("Bottom Sheetの経路線は全停留所共通の1本軸で描画する", async () => {
  const source = await read("src/ui-v4.mjs");
  const css = await read("src/ui-system.css");
  assert.doesNotMatch(source, /tt-sheet-line/);
  assert.match(css, /\.tt-sheet-stops::before/);
  assert.match(css, /--tt-axis-x/);
  assert.match(css, /justify-self:center/);
});

test("選択便をブランド付きPNG共有カードとして共有できる", async () => {
  const source = await read("src/ui-v4.mjs");
  const share = await read("src/share-card.mjs");
  const identity = await read("src/share-identity.mjs");
  const css = await read("src/ui-system.css");
  assert.match(source, /openSharePreview/);
  assert.match(source, /next-share-button/);
  assert.match(source, /journey-share-button/);
  assert.match(source, /tt-sheet-share/);
  assert.match(share, /CARD_WIDTH = 1080/);
  assert.match(share, /CARD_HEIGHT = 1350/);
  assert.match(share, /阪大シャトル/);
  assert.match(share, /navigator\.share/);
  assert.match(share, /new File/);
  assert.match(share, /naoshi-git\.github\.io\/handai-shuttle/);
  assert.match(share, /shareTargetUrl/);
  assert.match(share, /shareLandingUrl/);
  assert.match(share, /選択した便/);
  assert.match(share, /混雑目安/);
  assert.doesNotMatch(share, /移動前に、阪大シャトル。/);
  assert.doesNotMatch(share, /最終便/);
  assert.match(identity, /share\.html/);
  assert.match(identity, /new URL\("share\.html", base\)/);
  assert.match(css, /share-card-dialog/);
});
