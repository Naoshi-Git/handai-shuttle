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

  drawBrandMark(ctx, 72, 70, 82);
  ctx.fillStyle = "#2d287f";
  font(ctx, 700, 18);
  ctx.fillText("HANDAI SHUTTLE", 178, 94);
  font(ctx, 800, 39);
  ctx.fillText("阪大シャトル", 178, 132);
  ctx.fillStyle = "#737280";
  font(ctx, 500, 17);
  ctx.fillText("大阪大学 学内連絡バス 非公式Webアプリ", 178, 166);

  const panelY = 218;
  const panelHeight = 638;
  const panel = ctx.createLinearGradient(72, panelY, 1008, panelY + panelHeight);
  panel.addColorStop(0, "#292477");
  panel.addColorStop(.58, "#38318d");
  panel.addColorStop(1, "#6055bd");
  ctx.save();
  ctx.shadowColor = "rgba(36,31,103,.16)";
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 12;
  fillRoundRect(ctx, 72, panelY, 936, panelHeight, 54, panel);
  ctx.restore();

  ctx.save();
  roundRectPath(ctx, 72, panelY, 936, panelHeight, 54);
  ctx.clip();
  ctx.strokeStyle = "rgba(255,255,255,.07)";
  ctx.lineWidth = 48;
  ctx.beginPath();
  ctx.arc(870, 630, 244, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,.10)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(870, 630, 158, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  drawPill(ctx, safeText(data.sourceLabel, "選択した便"), 124, 258, {
    fill: "rgba(255,255,255,.13)", color: "rgba(255,255,255,.86)", height: 40, padX: 17, size: 17
  });

  const route = `${safeText(data.origin, "出発")}  →  ${safeText(data.destination, "到着")}`;
  const routeSize = fitFont(ctx, route, 800, 52, 36, 800);
  font(ctx, 800, routeSize);
  ctx.fillStyle = "#fff";
  ctx.fillText(route, 124, 350);

  const departure = safeText(data.departure, "--:--");
  const arrival = safeText(data.arrival, "--:--");
  let timeSize = 98;
  let departureWidth = 0;
  let arrivalWidth = 0;
  let departureUnitWidth = 0;
  let arrivalUnitWidth = 0;
  let arrowWidth = 0;
  let unitSize = 0;
  let arrowSize = 0;
  while (timeSize >= 70) {
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
    if (departureWidth + departureUnitWidth + arrivalWidth + arrivalUnitWidth + arrowWidth + 86 <= 800) break;
    timeSize -= 2;
  }

  let timeX = 124;
  const timeY = 474;
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
  const pillY = 562;
  const routeType = safeText(data.routeType, "運行便");
  pillX += drawPill(ctx, routeType, pillX, pillY, { height: 46, padX: 18, size: 19 }) + 10;
  if (data.duration) pillX += drawPill(ctx, safeText(data.duration), pillX, pillY, { height: 46, padX: 18, size: 19 }) + 10;
  if (data.tripId) drawPill(ctx, `${safeText(data.tripId).replace(/便$/, "")}便`, pillX, pillY, { height: 46, padX: 18, size: 19 });

  ctx.strokeStyle = "rgba(255,255,255,.16)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(124, 640);
  ctx.lineTo(956, 640);
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,.76)";
  font(ctx, 700, 19);
  ctx.fillText("混雑目安", 124, 690);
  drawCrowding(ctx, 246, 660, Number(data.crowdingLevel) || 1);
  ctx.fillStyle = "rgba(255,255,255,.55)";
  font(ctx, 500, 16);
  ctx.fillText("時間割ベースの推定", 390, 690);

  const stopLine = [safeText(data.originDetail), safeText(data.destinationDetail)].filter(Boolean).join("  →  ");
  if (stopLine) {
    const stopSize = fitFont(ctx, stopLine, 620, 22, 18, 600);
    font(ctx, 600, stopSize);
    ctx.fillStyle = "rgba(255,255,255,.84)";
    ctx.fillText(stopLine, 124, 770);
  }
  if (data.date) {
    ctx.fillStyle = "rgba(255,255,255,.66)";
    font(ctx, 600, 18);
    ctx.textAlign = "right";
    ctx.fillText(safeText(data.date), 956, 770);
    ctx.textAlign = "left";
  }

  const introY = 922;
  const introHeight = 278;
  ctx.save();
  ctx.shadowColor = "rgba(31,28,75,.07)";
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 8;
  fillRoundRect(ctx, 72, introY, 936, introHeight, 42, "#fff");
  ctx.restore();
  fillRoundRect(ctx, 72, introY, 936, introHeight, 42, "#fff");

  ctx.fillStyle = "#2d287f";
  font(ctx, 800, 31);
  ctx.fillText("阪大シャトル", 124, 976);
  ctx.fillStyle = "#242334";
  font(ctx, 700, 25);
  ctx.fillText("豊中・箕面・吹田のバス時刻を、すぐ確認。", 124, 1020);

  let featureX = 124;
  featureX += drawPill(ctx, "次の便", featureX, 1054, { fill: "#f0effa", color: "#2d287f", height: 40, padX: 16, size: 17 }) + 9;
  featureX += drawPill(ctx, "最終便", featureX, 1054, { fill: "#f0effa", color: "#2d287f", height: 40, padX: 16, size: 17 }) + 9;
  drawPill(ctx, "混雑目安", featureX, 1054, { fill: "#f0effa", color: "#2d287f", height: 40, padX: 16, size: 17 });

  ctx.fillStyle = "#6f6e7c";
  font(ctx, 600, 18);
  ctx.fillText(DISPLAY_URL, 124, 1143);

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
