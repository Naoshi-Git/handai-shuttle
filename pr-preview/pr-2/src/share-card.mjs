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

function font(ctx, weight, size) {
  ctx.font = `${weight} ${size}px system-ui, -apple-system, BlinkMacSystemFont, "Hiragino Sans", "Yu Gothic", sans-serif`;
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

function drawShareCard(data) {
  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvasを初期化できませんでした");

  // Match the product UI: a quiet canvas, one strong indigo accent, and one journey card.
  ctx.fillStyle = "#f7f7f9";
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
  ctx.fillStyle = "#2d287f";
  ctx.fillRect(0, 0, CARD_WIDTH, 18);

  drawBrandMark(ctx, 72, 72, 76);
  ctx.fillStyle = "#2d287f";
  font(ctx, 900, 34);
  ctx.textBaseline = "middle";
  ctx.fillText("阪大シャトル", 172, 98);
  ctx.fillStyle = "#777780";
  font(ctx, 700, 20);
  ctx.fillText("学内連絡バスを検索", 172, 136);

  fillRoundRect(ctx, 72, 214, 936, 786, 48, "#ffffff");
  ctx.save();
  ctx.shadowColor = "rgba(24,24,30,.08)";
  ctx.shadowBlur = 26;
  ctx.shadowOffsetY = 10;
  fillRoundRect(ctx, 72, 214, 936, 786, 48, "#ffffff");
  ctx.restore();

  ctx.fillStyle = "#f0effa";
  fillRoundRect(ctx, 124, 272, 156, 50, 25, "#f0effa");
  ctx.fillStyle = "#2d287f";
  font(ctx, 900, 20);
  ctx.textBaseline = "middle";
  ctx.fillText(safeText(data.sourceLabel, "選択した便"), 150, 298);

  if (data.date) {
    ctx.fillStyle = "#777780";
    font(ctx, 750, 22);
    ctx.textAlign = "right";
    ctx.fillText(safeText(data.date), 948, 298);
    ctx.textAlign = "left";
  }

  const route = `${safeText(data.origin, "出発")}  →  ${safeText(data.destination, "到着")}`;
  const routeSize = fitFont(ctx, route, 760, 56, 36, 900);
  font(ctx, 900, routeSize);
  ctx.fillStyle = "#242429";
  ctx.fillText(route, 124, 406);

  const times = `${safeText(data.departure, "--:--")}  →  ${safeText(data.arrival, "--:--")}`;
  const timeSize = fitFont(ctx, times, 780, 108, 72, 900);
  font(ctx, 900, timeSize);
  ctx.fillStyle = "#2d287f";
  ctx.fillText(times, 124, 562);

  ctx.strokeStyle = "#e8e8ed";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(124, 630);
  ctx.lineTo(956, 630);
  ctx.stroke();

  let pillX = 124;
  const routeType = safeText(data.routeType, "運行便");
  pillX += drawPill(ctx, routeType, pillX, 684, { fill: "#f0effa", color: "#2d287f", height: 52, padX: 22, size: 22 }) + 12;
  if (data.duration) pillX += drawPill(ctx, safeText(data.duration), pillX, 684, { fill: "#f4f4f6", color: "#44444d", height: 52, padX: 22, size: 22 }) + 12;
  if (data.tripId) drawPill(ctx, `${safeText(data.tripId).replace(/便$/, "")}便`, pillX, 684, { fill: "#f4f4f6", color: "#44444d", height: 52, padX: 22, size: 22 });

  ctx.fillStyle = "#777780";
  font(ctx, 800, 21);
  ctx.fillText("混雑目安", 124, 818);
  drawCrowding(ctx, 264, 786, Number(data.crowdingLevel) || 1, { dark: true });

  const stopLine = [safeText(data.originDetail), safeText(data.destinationDetail)].filter(Boolean).join("  →  ");
  if (stopLine) {
    ctx.fillStyle = "#777780";
    const stopSize = fitFont(ctx, stopLine, 780, 25, 19, 700);
    font(ctx, 700, stopSize);
    ctx.fillText(stopLine, 124, 910);
  }

  fillRoundRect(ctx, 72, 1052, 936, 156, 36, "#efeff3");
  ctx.fillStyle = "#2d287f";
  font(ctx, 900, 28);
  ctx.fillText("阪大シャトル", 124, 1114);
  ctx.fillStyle = "#5f5f68";
  font(ctx, 700, 21);
  ctx.fillText("次の便と時刻表を、すぐ確認。", 124, 1160);
  ctx.fillStyle = "#5f5f68";
  font(ctx, 750, 19);
  ctx.textAlign = "right";
  ctx.fillText(DISPLAY_URL, 956, 1160);
  ctx.textAlign = "left";

  ctx.fillStyle = "#8a8a92";
  font(ctx, 650, 17);
  ctx.fillText("※ 大阪大学公式サービスではありません。運行情報は公式案内もご確認ください。", 72, 1284);
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
        <div><span>共有</span><h3>この便を共有</h3></div>
        <button type="button" class="share-card-close" aria-label="共有画面を閉じる">×</button>
      </header>
      <div class="share-card-preview"><img id="share-card-image" alt="阪大シャトルの共有カード"></div>
      <p class="share-card-copy">便の情報を画像として共有できます。</p>
      <div class="share-card-actions">
        <button type="button" class="share-card-primary" id="share-card-native">共有</button>
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
