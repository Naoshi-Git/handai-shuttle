import { drawBrandMark } from "./brand-canvas.mjs";
import { ensureShareIdentity, shareLandingUrl } from "./share-identity.mjs";

const APP_URL = "https://naoshi-git.github.io/handai-shuttle/";
const DISPLAY_URL = "naoshi-git.github.io/handai-shuttle/";
const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1350;
const CARD_MARGIN = 72;
const PANEL_WIDTH = CARD_WIDTH - CARD_MARGIN * 2;
const CONTENT_X = CARD_MARGIN + 52;
const CONTENT_WIDTH = PANEL_WIDTH - 104;

let activePreviewUrl = null;
let activeShare = null;

function shareTargetUrl() {
  return shareLandingUrl();
}

const SHARE_CARD_FONT = '-apple-system, BlinkMacSystemFont, "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif';

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

function fitPairFont(ctx, left, right, maxWidth, initialSize, minSize, weight = 800, arrowLength = 44, gap = 22) {
  let size = initialSize;
  while (size > minSize) {
    font(ctx, weight, size);
    const leftWidth = ctx.measureText(left).width;
    const rightWidth = ctx.measureText(right).width;
    if (leftWidth + rightWidth + arrowLength + gap * 2 <= maxWidth) {
      return { size, leftWidth, rightWidth };
    }
    size -= 2;
  }
  font(ctx, weight, minSize);
  return {
    size: minSize,
    leftWidth: ctx.measureText(left).width,
    rightWidth: ctx.measureText(right).width
  };
}

function drawPill(ctx, text, x, y, { fill = "rgba(255,255,255,.16)", color = "#fff", height = 54, padX = 24, size = 25 } = {}) {
  ctx.save();
  font(ctx, 800, size);
  const width = Math.ceil(ctx.measureText(text).width + padX * 2);
  fillRoundRect(ctx, x, y, width, height, height / 2, fill);
  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillText(text, x + padX, y + height / 2 + 1);
  ctx.restore();
  return width;
}

function drawDirectionalArrow(ctx, x, y, length, { color = "rgba(255,255,255,.78)", lineWidth = 3.5, head = 10 } = {}) {
  const endX = x + length;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(endX, y);
  ctx.moveTo(endX - head, y - head * .72);
  ctx.lineTo(endX, y);
  ctx.lineTo(endX - head, y + head * .72);
  ctx.stroke();
  ctx.restore();
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
    document.fonts.load(`800 24px ${SHARE_CARD_FONT}`),
    document.fonts.load(`900 24px ${SHARE_CARD_FONT}`)
  ]).catch(() => {});
}

function drawShareHeader(ctx) {
  const iconX = CARD_MARGIN;
  const iconY = 70;
  const iconSize = 78;
  const copyX = 174;

  drawBrandMark(ctx, iconX, iconY, iconSize);

  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.fillStyle = "#2d287f";
  font(ctx, 700, 18);
  ctx.fillText("HANDAI SHUTTLE", copyX, 87);

  font(ctx, 800, 38);
  ctx.fillText("阪大シャトル", copyX, 126);

  ctx.fillStyle = "#777684";
  font(ctx, 500, 16);
  ctx.fillText("大阪大学 学内連絡バス 非公式Webアプリ", copyX, 154);
}

function drawRouteLine(ctx, origin, destination, y) {
  const arrowLength = 44;
  const gap = 22;
  const layout = fitPairFont(ctx, origin, destination, CONTENT_WIDTH, 50, 34, 800, arrowLength, gap);

  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#fff";
  font(ctx, 800, layout.size);
  ctx.fillText(origin, CONTENT_X, y);

  const arrowX = CONTENT_X + layout.leftWidth + gap;
  const arrowY = y - layout.size * .34;
  drawDirectionalArrow(ctx, arrowX, arrowY, arrowLength, { lineWidth: 3.8, head: 10 });

  ctx.fillText(destination, arrowX + arrowLength + gap, y);
}

function drawTimeLine(ctx, departure, arrival, centerY) {
  let timeSize = 96;
  let unitSize = 0;
  let departureWidth = 0;
  let arrivalWidth = 0;
  let departureUnitWidth = 0;
  let arrivalUnitWidth = 0;
  const arrowLength = 46;
  const numberUnitGap = 9;
  const arrowGap = 24;

  while (timeSize >= 70) {
    unitSize = Math.max(18, Math.round(timeSize * .22));
    font(ctx, 900, timeSize);
    departureWidth = ctx.measureText(departure).width;
    arrivalWidth = ctx.measureText(arrival).width;
    font(ctx, 700, unitSize);
    departureUnitWidth = ctx.measureText("発").width;
    arrivalUnitWidth = ctx.measureText("着").width;
    const total = departureWidth + numberUnitGap + departureUnitWidth + arrowGap + arrowLength + arrowGap + arrivalWidth + numberUnitGap + arrivalUnitWidth;
    if (total <= CONTENT_WIDTH) break;
    timeSize -= 2;
  }

  const totalWidth = departureWidth + numberUnitGap + departureUnitWidth + arrowGap + arrowLength + arrowGap + arrivalWidth + numberUnitGap + arrivalUnitWidth;
  let x = CONTENT_X + Math.max(0, (CONTENT_WIDTH - totalWidth) / 2);

  ctx.save();
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";

  ctx.fillStyle = "#fff";
  font(ctx, 900, timeSize);
  ctx.fillText(departure, x, centerY);
  x += departureWidth + numberUnitGap;

  ctx.fillStyle = "rgba(255,255,255,.68)";
  font(ctx, 700, unitSize);
  ctx.fillText("発", x, centerY + timeSize * .13);
  x += departureUnitWidth + arrowGap;

  drawDirectionalArrow(ctx, x, centerY, arrowLength, { color: "rgba(255,255,255,.72)", lineWidth: 3.6, head: 10 });
  x += arrowLength + arrowGap;

  ctx.fillStyle = "#fff";
  font(ctx, 900, timeSize);
  ctx.fillText(arrival, x, centerY);
  x += arrivalWidth + numberUnitGap;

  ctx.fillStyle = "rgba(255,255,255,.68)";
  font(ctx, 700, unitSize);
  ctx.fillText("着", x, centerY + timeSize * .13);
  ctx.restore();
}

function drawJourneyPanel(ctx, data) {
  const panelY = 218;
  const panelHeight = 480;
  const panel = ctx.createLinearGradient(CARD_MARGIN, panelY, CARD_MARGIN + PANEL_WIDTH, panelY + panelHeight);
  panel.addColorStop(0, "#292477");
  panel.addColorStop(.58, "#39318e");
  panel.addColorStop(1, "#5c51ba");

  ctx.save();
  ctx.shadowColor = "rgba(36,31,103,.15)";
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 10;
  fillRoundRect(ctx, CARD_MARGIN, panelY, PANEL_WIDTH, panelHeight, 52, panel);
  ctx.restore();

  fillRoundRect(ctx, CARD_MARGIN, panelY, PANEL_WIDTH, panelHeight, 52, panel);

  const origin = safeText(data.origin, "出発");
  const destination = safeText(data.destination, "到着");
  drawRouteLine(ctx, origin, destination, 303);

  const departure = safeText(data.departure, "--:--");
  const arrival = safeText(data.arrival, "--:--");
  drawTimeLine(ctx, departure, arrival, 402);

  let pillX = CONTENT_X;
  const pillY = 475;
  const routeType = safeText(data.routeType, "運行便");
  pillX += drawPill(ctx, routeType, pillX, pillY, { height: 46, padX: 18, size: 19 }) + 10;
  if (data.duration) pillX += drawPill(ctx, safeText(data.duration), pillX, pillY, { height: 46, padX: 18, size: 19 }) + 10;
  if (data.tripId) drawPill(ctx, `${safeText(data.tripId).replace(/便$/, "")}便`, pillX, pillY, { height: 46, padX: 18, size: 19 });

  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "rgba(255,255,255,.78)";
  font(ctx, 700, 20);
  ctx.fillText("混雑目安", CONTENT_X, 612);
  drawCrowding(ctx, CONTENT_X + 126, 575, Number(data.crowdingLevel) || 1);
}

function drawProductIntro(ctx) {
  const introY = 786;
  const introHeight = 380;

  ctx.save();
  ctx.shadowColor = "rgba(31,28,75,.07)";
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 8;
  fillRoundRect(ctx, CARD_MARGIN, introY, PANEL_WIDTH, introHeight, 42, "#fff");
  ctx.restore();
  fillRoundRect(ctx, CARD_MARGIN, introY, PANEL_WIDTH, introHeight, 42, "#fff");

  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";

  ctx.fillStyle = "#2d287f";
  font(ctx, 800, 32);
  ctx.fillText("阪大シャトル", CONTENT_X, 858);

  ctx.fillStyle = "#252434";
  font(ctx, 700, 24);
  ctx.fillText("豊中・箕面・吹田のバス時刻を、すぐ確認。", CONTENT_X, 908);

  ctx.fillStyle = "#747382";
  font(ctx, 600, 18);
  ctx.fillText("次の便・最終便・混雑目安まで、ひとつの画面で。", CONTENT_X, 952);

  ctx.fillStyle = "#2d287f";
  font(ctx, 650, 18);
  ctx.fillText(DISPLAY_URL, CONTENT_X, 1092);
}

function drawDisclaimer(ctx) {
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "center";
  ctx.fillStyle = "#8a8999";
  font(ctx, 500, 17);
  ctx.fillText("※ 大阪大学公式サービスではありません。運行情報は公式案内もご確認ください。", CARD_WIDTH / 2, 1270);
  ctx.textAlign = "left";
}

function drawShareCard(data) {
  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvasを初期化できませんでした");

  const bg = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
  bg.addColorStop(0, "#fbfbfd");
  bg.addColorStop(1, "#f1f2fa");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  drawShareHeader(ctx);
  drawJourneyPanel(ctx, data);
  drawProductIntro(ctx);
  drawDisclaimer(ctx);
  return canvas;
}

function canvasBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("画像を生成できませんでした")), "image/png", 1);
  });
}

function shareText(data) {
  const date = safeText(data.date);
  const datePrefix = date ? `${date} ` : "";
  return `${datePrefix}${safeText(data.origin, "出発")} → ${safeText(data.destination, "到着")} ${safeText(data.departure, "--:--")}発 / ${safeText(data.arrival, "--:--")}着\n阪大シャトルで学内連絡バスを検索`;
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
      <p class="share-card-copy">便情報を画像で共有できます。</p>
      <div class="share-card-actions">
        <button type="button" class="share-card-primary" id="share-card-native">画像を共有</button>
        <button type="button" class="share-card-secondary" id="share-card-copy">リンクだけコピー</button>
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
