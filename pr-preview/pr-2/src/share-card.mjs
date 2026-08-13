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

  const bg = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
  bg.addColorStop(0, "#fafafd");
  bg.addColorStop(1, "#eef0fa");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  // Brand area: deliberately quieter than the journey card so the selected bus remains the visual hero.
  drawBrandMark(ctx, 72, 68, 82);
  ctx.fillStyle = "#2d287f";
  font(ctx, 850, 20);
  ctx.textBaseline = "middle";
  ctx.fillText("HANDAI SHUTTLE", 176, 88);
  font(ctx, 900, 43);
  ctx.fillText("阪大シャトル", 176, 132);
  ctx.fillStyle = "#77768a";
  font(ctx, 650, 18);
  ctx.fillText("大阪大学 学内連絡バス 非公式Webアプリ", 176, 166);

  const panel = ctx.createLinearGradient(72, 226, 1008, 842);
  panel.addColorStop(0, "#27226e");
  panel.addColorStop(.56, "#38308b");
  panel.addColorStop(1, "#5e52bd");
  ctx.save();
  ctx.shadowColor = "rgba(36,31,103,.22)";
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 14;
  fillRoundRect(ctx, 72, 226, 936, 626, 52, panel);
  ctx.restore();

  ctx.save();
  roundRectPath(ctx, 72, 226, 936, 626, 52);
  ctx.clip();
  ctx.strokeStyle = "rgba(255,255,255,.07)";
  ctx.lineWidth = 42;
  ctx.beginPath();
  ctx.arc(866, 622, 254, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(255,255,255,.11)";
  ctx.beginPath();
  ctx.arc(866, 622, 176, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  drawPill(ctx, safeText(data.sourceLabel, "選択した便"), 124, 272, {
    fill: "rgba(255,255,255,.13)", color: "rgba(255,255,255,.86)", height: 42, padX: 18, size: 18
  });

  const route = `${safeText(data.origin, "出発")}  →  ${safeText(data.destination, "到着")}`;
  const routeSize = fitFont(ctx, route, 790, 54, 36, 900);
  font(ctx, 900, routeSize);
  ctx.fillStyle = "#fff";
  ctx.fillText(route, 124, 366);

  const departure = safeText(data.departure, "--:--");
  const arrival = safeText(data.arrival, "--:--");
  let timeSize = 100;
  let departureWidth = 0;
  let arrivalWidth = 0;
  let departureUnitWidth = 0;
  let arrivalUnitWidth = 0;
  let arrowWidth = 0;
  let unitSize = 0;
  let arrowSize = 0;
  while (timeSize >= 70) {
    unitSize = Math.max(19, Math.round(timeSize * .21));
    arrowSize = Math.max(27, Math.round(timeSize * .34));
    font(ctx, 900, timeSize);
    departureWidth = ctx.measureText(departure).width;
    arrivalWidth = ctx.measureText(arrival).width;
    font(ctx, 750, unitSize);
    departureUnitWidth = ctx.measureText("発").width;
    arrivalUnitWidth = ctx.measureText("着").width;
    font(ctx, 800, arrowSize);
    arrowWidth = ctx.measureText("→").width;
    const required = departureWidth + departureUnitWidth + arrivalWidth + arrivalUnitWidth + arrowWidth + 94;
    if (required <= 800) break;
    timeSize -= 2;
  }

  let timeX = 124;
  const timeY = 510;
  ctx.fillStyle = "#fff";
  font(ctx, 900, timeSize);
  ctx.fillText(departure, timeX, timeY);
  timeX += departureWidth + 10;
  font(ctx, 750, unitSize);
  ctx.fillStyle = "rgba(255,255,255,.72)";
  ctx.fillText("発", timeX, timeY + Math.round(timeSize * .13));
  timeX += departureUnitWidth + 36;
  font(ctx, 800, arrowSize);
  ctx.fillStyle = "rgba(255,255,255,.82)";
  ctx.fillText("→", timeX, timeY);
  timeX += arrowWidth + 36;
  font(ctx, 900, timeSize);
  ctx.fillStyle = "#fff";
  ctx.fillText(arrival, timeX, timeY);
  timeX += arrivalWidth + 10;
  font(ctx, 750, unitSize);
  ctx.fillStyle = "rgba(255,255,255,.72)";
  ctx.fillText("着", timeX, timeY + Math.round(timeSize * .13));

  let pillX = 124;
  const routeType = safeText(data.routeType, "運行便");
  pillX += drawPill(ctx, routeType, pillX, 574, { height: 48, padX: 19, size: 20 }) + 12;
  if (data.duration) pillX += drawPill(ctx, safeText(data.duration), pillX, 574, { height: 48, padX: 19, size: 20 }) + 12;
  if (data.tripId) drawPill(ctx, `${safeText(data.tripId).replace(/便$/, "")}便`, pillX, 574, { height: 48, padX: 19, size: 20 });

  ctx.strokeStyle = "rgba(255,255,255,.16)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(124, 662);
  ctx.lineTo(956, 662);
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,.72)";
  font(ctx, 750, 20);
  ctx.fillText("混雑目安", 124, 716);
  drawCrowding(ctx, 245, 686, Number(data.crowdingLevel) || 1);
  ctx.fillStyle = "rgba(255,255,255,.58)";
  font(ctx, 600, 17);
  ctx.fillText("時間割ベースの推定", 392, 716);

  const stopLine = [safeText(data.originDetail), safeText(data.destinationDetail)].filter(Boolean).join("  →  ");
  if (stopLine) {
    const stopSize = fitFont(ctx, stopLine, 620, 23, 18, 650);
    font(ctx, 650, stopSize);
    ctx.fillStyle = "rgba(255,255,255,.82)";
    ctx.fillText(stopLine, 124, 790);
  }
  if (data.date) {
    ctx.fillStyle = "rgba(255,255,255,.64)";
    font(ctx, 700, 19);
    ctx.textAlign = "right";
    ctx.fillText(safeText(data.date), 956, 790);
    ctx.textAlign = "left";
  }

  ctx.save();
  ctx.shadowColor = "rgba(31,28,75,.10)";
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 10;
  fillRoundRect(ctx, 72, 904, 936, 350, 46, "#ffffff");
  ctx.restore();
  fillRoundRect(ctx, 72, 904, 936, 350, 46, "#ffffff");

  ctx.fillStyle = "#2d287f";
  font(ctx, 850, 29);
  ctx.fillText("移動前に、阪大シャトル。", 124, 968);
  ctx.fillStyle = "#19172e";
  font(ctx, 900, 40);
  ctx.fillText("次の便が、すぐわかる。", 124, 1026);
  ctx.fillStyle = "#77768a";
  font(ctx, 600, 20);
  ctx.fillText("豊中・箕面・吹田の時刻検索 / 最終便 / 混雑目安", 124, 1070);

  let featureX = 124;
  featureX += drawPill(ctx, "次の便", featureX, 1110, { fill: "#f0effa", color: "#2d287f", height: 44, padX: 18, size: 19 }) + 9;
  featureX += drawPill(ctx, "最終便", featureX, 1110, { fill: "#f0effa", color: "#2d287f", height: 44, padX: 18, size: 19 }) + 9;
  drawPill(ctx, "混雑目安", featureX, 1110, { fill: "#f0effa", color: "#2d287f", height: 44, padX: 18, size: 19 });

  fillRoundRect(ctx, 124, 1180, 832, 52, 26, "#2d287f");
  ctx.fillStyle = "#fff";
  font(ctx, 800, 20);
  ctx.fillText("阪大シャトルを開く", 154, 1206);
  ctx.fillStyle = "rgba(255,255,255,.76)";
  font(ctx, 650, 18);
  ctx.textAlign = "right";
  ctx.fillText(DISPLAY_URL, 928, 1206);
  ctx.textAlign = "left";

  ctx.fillStyle = "#8a8999";
  font(ctx, 600, 17);
  ctx.fillText("※ 大阪大学公式サービスではありません。運行情報は公式案内もご確認ください。", 80, 1302);
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
