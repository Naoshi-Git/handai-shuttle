import { drawBrandMark } from "./brand-canvas.mjs";
import { ensureShareIdentity, shareLandingUrl } from "./share-identity.mjs";

const APP_URL = "https://naoshi-git.github.io/handai-shuttle/";
const DISPLAY_URL = "naoshi-git.github.io/handai-shuttle/";
const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1350;

let activePreviewUrl = null;
let activeShare = null;

function shareTargetUrl() {
  return shareLandingUrl();
}

const SHARE_CARD_FONT = '"Noto Sans CJK JP", "Noto Sans JP", "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif';

function font(ctx, weight, size) {
  ctx.font = `${weight} ${size}px ${SHARE_CARD_FONT}`;
}

function roundRectPath(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function fillRoundRect(ctx, x, y, width, height, radius, fill) {
  roundRectPath(ctx, x, y, width, height, radius);
  ctx.fillStyle = fill;
  ctx.fill();
}

function fitFont(ctx, text, maxWidth, initialSize, minSize, weight = 800) {
  let size = initialSize;
  while (size > minSize) {
    font(ctx, weight, size);
    if (ctx.measureText(text).width <= maxWidth) return size;
    size -= 2;
  }
  return minSize;
}

function drawPill(ctx, text, x, y, { fill = "rgba(255,255,255,.16)", color = "#fff", height = 54, padX = 24, size = 25 } = {}) {
  font(ctx, 800, size);
  const width = Math.ceil(ctx.measureText(text).width + padX * 2);
  fillRoundRect(ctx, x, y, width, height, height / 2, fill);
  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + padX, y + height / 2 + 1);
  return width;
}

function crowdColor(level) {
  return ["#2c9a78", "#2c9a78", "#3c9b62", "#c99524", "#df762d", "#d24b5d"][level] || "#2c9a78";
}

function drawCrowding(ctx, x, y, level, { dark = false } = {}) {
  const activeColor = crowdColor(level);
  const inactive = dark ? "#d8d9e0" : "rgba(255,255,255,.34)";
  for (let i = 0; i < 5; i += 1) {
    const px = x + i * 25;
    ctx.fillStyle = i < level ? activeColor : inactive;
    ctx.beginPath();
    ctx.arc(px + 8, y + 7, 6, 0, Math.PI * 2);
    ctx.fill();
    fillRoundRect(ctx, px, y + 17, 16, 27, 7, ctx.fillStyle);
  }
}

function safeText(value, fallback = "") {
  return String(value || fallback).replace(/\s+/g, " ").trim();
}

async function ensureShareCardFont() {
  if (!document.fonts?.load) return;
  await Promise.all([
    document.fonts.load(`500 24px ${SHARE_CARD_FONT}`),
    document.fonts.load(`700 24px ${SHARE_CARD_FONT}`),
    document.fonts.load(`900 24px ${SHARE_CARD_FONT}`)
  ]).catch(() => {});
}

function drawShareCard(data) {
  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvasを初期化できませんでした");

  const bg = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
  bg.addColorStop(0, "#fbfbfd");
  bg.addColorStop(1, "#f0f1fa");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
  ctx.textBaseline = "middle";

  // Brand is intentionally compact: the selected journey, not the logo, is the visual protagonist.
  drawBrandMark(ctx, 72, 72, 76);
  ctx.fillStyle = "#2d287f";
  font(ctx, 700, 18);
  ctx.fillText("HANDAI SHUTTLE", 172, 95);
  font(ctx, 800, 38);
  ctx.fillText("阪大シャトル", 172, 132);
  ctx.fillStyle = "#6f6e7c";
  font(ctx, 500, 17);
  ctx.fillText("大阪大学 学内連絡バス 非公式Webアプリ", 172, 166);

  const panelY = 218;
  const panelHeight = 550;
  const panel = ctx.createLinearGradient(72, panelY, 1008, panelY + panelHeight);
  panel.addColorStop(0, "#2a2674");
  panel.addColorStop(.58, "#39318e");
  panel.addColorStop(1, "#5c51ba");
  ctx.save();
  ctx.shadowColor = "rgba(36,31,103,.18)";
  ctx.shadowBlur = 26;
  ctx.shadowOffsetY = 12;
  fillRoundRect(ctx, 72, panelY, 936, panelHeight, 50, panel);
  ctx.restore();

  ctx.save();
  roundRectPath(ctx, 72, panelY, 936, panelHeight, 50);
  ctx.clip();
  ctx.strokeStyle = "rgba(255,255,255,.065)";
  ctx.lineWidth = 38;
  ctx.beginPath();
  ctx.arc(868, 578, 232, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,.11)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(868, 578, 162, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  drawPill(ctx, safeText(data.sourceLabel, "選択した便"), 124, 258, {
    fill: "rgba(255,255,255,.13)", color: "rgba(255,255,255,.86)", height: 40, padX: 17, size: 17
  });

  const route = `${safeText(data.origin, "出発")}  →  ${safeText(data.destination, "到着")}`;
  const routeSize = fitFont(ctx, route, 790, 50, 34, 800);
  font(ctx, 800, routeSize);
  ctx.fillStyle = "#fff";
  ctx.fillText(route, 124, 352);

  const departure = safeText(data.departure, "--:--");
  const arrival = safeText(data.arrival, "--:--");
  let timeSize = 94;
  let departureWidth = 0;
  let arrivalWidth = 0;
  let departureUnitWidth = 0;
  let arrivalUnitWidth = 0;
  let arrowWidth = 0;
  let unitSize = 0;
  let arrowSize = 0;
  while (timeSize >= 68) {
    unitSize = Math.max(18, Math.round(timeSize * .22));
    arrowSize = Math.max(25, Math.round(timeSize * .32));
    font(ctx, 900, timeSize);
    departureWidth = ctx.measureText(departure).width;
    arrivalWidth = ctx.measureText(arrival).width;
    font(ctx, 700, unitSize);
    departureUnitWidth = ctx.measureText("発").width;
    arrivalUnitWidth = ctx.measureText("着").width;
    font(ctx, 700, arrowSize);
    arrowWidth = ctx.measureText("→").width;
    if (departureWidth + departureUnitWidth + arrivalWidth + arrivalUnitWidth + arrowWidth + 86 <= 790) break;
    timeSize -= 2;
  }

  let timeX = 124;
  const timeY = 468;
  ctx.fillStyle = "#fff";
  font(ctx, 900, timeSize);
  ctx.fillText(departure, timeX, timeY);
  timeX += departureWidth + 10;
  font(ctx, 700, unitSize);
  ctx.fillStyle = "rgba(255,255,255,.70)";
  ctx.fillText("発", timeX, timeY + Math.round(timeSize * .12));
  timeX += departureUnitWidth + 30;
  font(ctx, 700, arrowSize);
  ctx.fillStyle = "rgba(255,255,255,.76)";
  ctx.fillText("→", timeX, timeY);
  timeX += arrowWidth + 30;
  font(ctx, 900, timeSize);
  ctx.fillStyle = "#fff";
  ctx.fillText(arrival, timeX, timeY);
  timeX += arrivalWidth + 10;
  font(ctx, 700, unitSize);
  ctx.fillStyle = "rgba(255,255,255,.70)";
  ctx.fillText("着", timeX, timeY + Math.round(timeSize * .12));

  let pillX = 124;
  const routeType = safeText(data.routeType, "運行便");
  pillX += drawPill(ctx, routeType, pillX, 532, { height: 46, padX: 18, size: 19 }) + 10;
  if (data.duration) pillX += drawPill(ctx, safeText(data.duration), pillX, 532, { height: 46, padX: 18, size: 19 }) + 10;
  if (data.tripId) drawPill(ctx, `${safeText(data.tripId).replace(/便$/, "")}便`, pillX, 532, { height: 46, padX: 18, size: 19 });

  ctx.strokeStyle = "rgba(255,255,255,.16)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(124, 604);
  ctx.lineTo(956, 604);
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,.74)";
  font(ctx, 700, 19);
  ctx.fillText("混雑目安", 124, 652);
  drawCrowding(ctx, 246, 622, Number(data.crowdingLevel) || 1);
  ctx.fillStyle = "rgba(255,255,255,.54)";
  font(ctx, 500, 16);
  ctx.fillText("時間割ベースの推定", 390, 652);

  const stopLine = [safeText(data.originDetail), safeText(data.destinationDetail)].filter(Boolean).join("  →  ");
  if (stopLine) {
    const stopSize = fitFont(ctx, stopLine, 600, 22, 18, 600);
    font(ctx, 600, stopSize);
    ctx.fillStyle = "rgba(255,255,255,.83)";
    ctx.fillText(stopLine, 124, 716);
  }
  if (data.date) {
    ctx.fillStyle = "rgba(255,255,255,.66)";
    font(ctx, 600, 18);
    ctx.textAlign = "right";
    ctx.fillText(safeText(data.date), 956, 716);
    ctx.textAlign = "left";
  }

  const introY = 822;
  const introHeight = 342;
  ctx.save();
  ctx.shadowColor = "rgba(31,28,75,.08)";
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 9;
  fillRoundRect(ctx, 72, introY, 936, introHeight, 44, "#fff");
  ctx.restore();
  fillRoundRect(ctx, 72, introY, 936, introHeight, 44, "#fff");

  ctx.fillStyle = "#2d287f";
  font(ctx, 700, 26);
  ctx.fillText("移動前に、阪大シャトル。", 124, 884);
  ctx.fillStyle = "#19172e";
  font(ctx, 800, 36);
  ctx.fillText("次の便が、すぐわかる。", 124, 934);
  ctx.fillStyle = "#77768a";
  font(ctx, 500, 18);
  ctx.fillText("豊中・箕面・吹田の時刻検索 / 最終便 / 混雑目安", 124, 978);

  let featureX = 124;
  featureX += drawPill(ctx, "次の便", featureX, 1018, { fill: "#f0effa", color: "#2d287f", height: 42, padX: 17, size: 18 }) + 9;
  featureX += drawPill(ctx, "最終便", featureX, 1018, { fill: "#f0effa", color: "#2d287f", height: 42, padX: 17, size: 18 }) + 9;
  drawPill(ctx, "混雑目安", featureX, 1018, { fill: "#f0effa", color: "#2d287f", height: 42, padX: 17, size: 18 });

  fillRoundRect(ctx, 124, 1088, 832, 50, 25, "#2d287f");
  ctx.fillStyle = "#fff";
  font(ctx, 700, 19);
  ctx.fillText("阪大シャトルを開く", 154, 1113);
  ctx.fillStyle = "rgba(255,255,255,.78)";
  font(ctx, 500, 17);
  ctx.textAlign = "right";
  ctx.fillText(DISPLAY_URL, 928, 1113);
  ctx.textAlign = "left";

  ctx.fillStyle = "#8a8999";
  font(ctx, 500, 16);
  ctx.fillText("※ 大阪大学公式サービスではありません。運行情報は公式案内もご確認ください。", 80, 1284);
  return canvas;
}
function canvasBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("画像を生成できませんでした")), "image/png", 1);
  });
}

function shareText(data) {
  return `${safeText(data.origin, "出発")} → ${safeText(data.destination, "到着")} ${safeText(data.departure, "--:--")}発 / ${safeText(data.arrival, "--:--")}着\n阪大シャトルで学内連絡バスを検索`;
}

function ensureDialog() {
  let dialog = document.querySelector("#share-card-dialog");
  if (dialog) return dialog;
  dialog = document.createElement("dialog");
  dialog.id = "share-card-dialog";
  dialog.className = "share-card-dialog";
  dialog.innerHTML = `
    <div class="share-card-shell">
      <header class="share-card-head">
        <div><span>SHARE</span><h3>この便を共有</h3></div>
        <button type="button" class="share-card-close" aria-label="共有画面を閉じる">×</button>
      </header>
      <div class="share-card-preview"><img id="share-card-image" alt="阪大シャトルの共有カード"></div>
      <p class="share-card-copy">便の情報と一緒に、阪大シャトルを紹介できます。</p>
      <div class="share-card-actions">
        <button type="button" class="share-card-primary" id="share-card-native">共有する</button>
        <button type="button" class="share-card-secondary" id="share-card-copy">リンクをコピー</button>
      </div>
      <p class="share-card-status" id="share-card-status" role="status"></p>
    </div>`;
  document.body.append(dialog);

  dialog.querySelector(".share-card-close")?.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });

  dialog.querySelector("#share-card-native")?.addEventListener("click", async () => {
    if (!activeShare) return;
    ensureShareIdentity();
    const status = dialog.querySelector("#share-card-status");
    const file = new File([activeShare.blob], "handai-shuttle-route.png", { type: "image/png" });
    const targetUrl = shareTargetUrl();
    const payload = { title: "阪大シャトル", text: shareText(activeShare.data), url: targetUrl };
    try {
      if (navigator.canShare?.({ files: [file] })) payload.files = [file];
      if (navigator.share) {
        await navigator.share(payload);
        if (status) status.textContent = "共有シートを開きました。";
        return;
      }
      await navigator.clipboard?.writeText(`${shareText(activeShare.data)}\n${targetUrl}`);
      if (status) status.textContent = "共有リンクをコピーしました。";
    } catch (error) {
      if (error?.name === "AbortError") return;
      if (status) status.textContent = "共有できませんでした。リンク共有をお試しください。";
    }
  });

  dialog.querySelector("#share-card-copy")?.addEventListener("click", async () => {
    if (!activeShare) return;
    const status = dialog.querySelector("#share-card-status");
    const targetUrl = shareTargetUrl();
    try {
      await navigator.clipboard.writeText(`${shareText(activeShare.data)}\n${targetUrl}`);
      if (status) status.textContent = "リンクをコピーしました。";
    } catch {
      if (status) status.textContent = targetUrl;
    }
  });
  return dialog;
}

export async function openSharePreview(data) {
  const dialog = ensureDialog();
  const status = dialog.querySelector("#share-card-status");
  if (status) status.textContent = "共有カードを作成中…";
  await ensureShareCardFont();
  const canvas = drawShareCard(data);
  const blob = await canvasBlob(canvas);
  if (activePreviewUrl) URL.revokeObjectURL(activePreviewUrl);
  activePreviewUrl = URL.createObjectURL(blob);
  activeShare = { data, blob };
  const image = dialog.querySelector("#share-card-image");
  if (image) image.src = activePreviewUrl;
  if (status) status.textContent = "";
  if (typeof dialog.showModal === "function") {
    if (!dialog.open) dialog.showModal();
  } else {
    dialog.setAttribute("open", "");
  }
}

export { APP_URL, CARD_WIDTH, CARD_HEIGHT, shareTargetUrl };
