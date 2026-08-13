import { snapshotElementToPng } from "./dom-snapshot.mjs";
import { mountShareSurface } from "./share-surface.mjs";
import { ensureShareIdentity, shareLandingUrl } from "./share-identity.mjs";

const APP_URL = "https://naoshi-git.github.io/handai-shuttle/";

let activePreviewUrl = null;
let activeShare = null;

function shareTargetUrl() {
  return shareLandingUrl();
}

function safeText(value, fallback = "") {
  return String(value || fallback).replace(/\s+/g, " ").trim();
}

function shareText(data) {
  const date = safeText(data?.date);
  const datePrefix = date ? `${date} ` : "";
  return `${datePrefix}${safeText(data?.origin, "出発")} → ${safeText(data?.destination, "到着")} ${safeText(data?.departure, "--:--")}発 / ${safeText(data?.arrival, "--:--")}着\n阪大シャトルで学内連絡バスを検索`;
}

function showDialog(dialog) {
  if (typeof dialog.showModal === "function") {
    if (!dialog.open) dialog.showModal();
  } else {
    dialog.setAttribute("open", "");
  }
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
      <div class="share-card-preview"><img id="share-card-image" alt="阪大シャトルの次便カード形式の共有画像"></div>
      <p class="share-card-copy">どの画面から共有しても、ホームの次便カードと同じUIで画像化します。</p>
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
    if (!activeShare?.blob) return;
    ensureShareIdentity();
    const status = dialog.querySelector("#share-card-status");
    const file = new File([activeShare.blob], "handai-shuttle.png", { type: "image/png" });
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
  const nativeButton = dialog.querySelector("#share-card-native");
  const image = dialog.querySelector("#share-card-image");

  if (status) status.textContent = "ホームと同じUIで共有画像を作成しています…";
  if (nativeButton) nativeButton.disabled = true;

  let mounted = null;
  try {
    mounted = await mountShareSurface(data);
    const blob = await snapshotElementToPng(mounted.element, { scale: 3 });
    if (activePreviewUrl) URL.revokeObjectURL(activePreviewUrl);
    activePreviewUrl = URL.createObjectURL(blob);
    activeShare = { data, blob };
    if (image) {
      image.style.aspectRatio = "auto";
      image.style.height = "auto";
      image.src = activePreviewUrl;
    }
    if (nativeButton) nativeButton.disabled = false;
    if (status) status.textContent = "";
  } catch (error) {
    activeShare = { data, blob: null };
    if (image) image.removeAttribute("src");
    if (status) status.textContent = `画像化できませんでした。${error?.message || "リンク共有をお試しください。"}`;
  } finally {
    mounted?.cleanup();
  }

  showDialog(dialog);
}

export { APP_URL, shareTargetUrl };
