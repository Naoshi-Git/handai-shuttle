const BUILD_KEY = "handai-shuttle:last-build";
const STATUS_ID = "pwa-update-status";

export function isStandalone() {
  return window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true;
}

export function isPreviewBuild() {
  return /\/pr-preview\/pr-\d+\//.test(window.location.pathname);
}

function previewNumber() {
  return window.location.pathname.match(/\/pr-preview\/pr-(\d+)\//)?.[1] || "";
}

async function fetchVersion() {
  const url = new URL("./version.json", window.location.href);
  url.searchParams.set("_", String(Date.now()));
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`version.json ${response.status}`);
  return response.json();
}

function setStatus(message, tone = "neutral") {
  const node = document.getElementById(STATUS_ID);
  if (!node) return;
  node.textContent = message;
  node.dataset.tone = tone;
}

async function reloadAssets(meta) {
  const assets = Array.isArray(meta?.assets) ? meta.assets : [];
  const reloadable = assets.filter((path) => /\.(?:html|css|js|mjs|json|webmanifest|svg|png|webp)$/i.test(path));
  await Promise.allSettled(reloadable.map((path) => {
    const url = new URL(path, window.location.href);
    url.searchParams.set("__build", String(meta.build || Date.now()).slice(0, 12));
    return fetch(url, { cache: "reload" });
  }));
}

function reloadDocument(build) {
  const url = new URL(window.location.href);
  url.searchParams.set("__appbuild", String(build || Date.now()).slice(0, 12));
  window.location.replace(url.toString());
}

export async function checkForAppUpdate({ force = false, reload = true } = {}) {
  setStatus("最新版を確認しています…");
  try {
    const meta = await fetchVersion();
    const current = String(meta?.build || "");
    const previous = localStorage.getItem(BUILD_KEY) || "";
    const changed = Boolean(current && previous && current !== previous);

    if (force || changed) {
      setStatus("最新版を読み込んでいます…");
      await reloadAssets(meta);
      if (current) localStorage.setItem(BUILD_KEY, current);
      if (reload) reloadDocument(current);
      return { updated: true, build: current };
    }

    if (current) localStorage.setItem(BUILD_KEY, current);
    setStatus("最新版です", "success");
    return { updated: false, build: current };
  } catch (error) {
    console.warn("Handai Shuttle update check failed", error);
    setStatus("更新確認に失敗しました。通信状態を確認してください。", "error");
    return { updated: false, error };
  }
}

function installStyles() {
  if (document.querySelector("style[data-pwa-ui]")) return;
  const style = document.createElement("style");
  style.dataset.pwaUi = "true";
  style.textContent = `
    .pwa-settings-card{display:grid;gap:11px}
    .pwa-settings-card p{margin:0;color:var(--muted);font-size:11px;line-height:1.65}
    .pwa-settings-state{display:flex;align-items:center;gap:8px;padding:9px 10px;border-radius:12px;background:var(--ou-50);color:var(--ou-900);font-size:11px;font-weight:800}
    .pwa-settings-state::before{content:"";width:8px;height:8px;border-radius:50%;background:#8e8fa0;flex:0 0 auto}
    .pwa-settings-state[data-installed="true"]::before{background:#2f9a76}
    .pwa-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    .pwa-actions button{min-height:42px;border-radius:12px;font-size:11px;font-weight:900;touch-action:manipulation}
    .pwa-guide-button{border:1px solid #d8d6eb;background:#fff;color:var(--ou-900)}
    .pwa-refresh-button{border:0;background:linear-gradient(135deg,var(--ou-700),var(--ou-950));color:#fff}
    .pwa-install-guide{display:none;margin:0;padding:10px 12px;border:1px solid #dfddeb;border-radius:12px;background:#fff;color:var(--ink);font-size:10.5px;line-height:1.7}
    .pwa-install-guide.is-open{display:block}
    .pwa-preview-note{padding:9px 10px;border-radius:11px;background:#fff7df;color:#7a5a16!important;border:1px solid #eedaa3;font-size:10px!important}
    #${STATUS_ID}{min-height:16px;color:var(--muted);font-size:9.5px!important}
    #${STATUS_ID}[data-tone="success"]{color:#2f8e72}
    #${STATUS_ID}[data-tone="error"]{color:#b34a56}
    @media(max-width:380px){.pwa-actions{grid-template-columns:1fr}}
  `;
  document.head.append(style);
}

function installSettingsCard() {
  const settings = document.getElementById("view-settings");
  if (!settings || settings.querySelector("[data-pwa-settings]")) return;
  const sourceCard = settings.querySelector(".source-card");
  const card = document.createElement("section");
  card.className = "settings-card pwa-settings-card";
  card.dataset.pwaSettings = "true";
  const standalone = isStandalone();
  const preview = isPreviewBuild();
  const pr = previewNumber();
  const previewNote = preview
    ? `<p class="pwa-preview-note">現在はPR Preview${pr ? ` #${pr}` : ""}です。ここから追加するとこのテスト版として登録されます。正式利用は本番URL公開後に本番ページから追加してください。</p>`
    : "";
  card.innerHTML = `
    <h3>ホーム画面に追加</h3>
    <div class="pwa-settings-state" data-installed="${standalone ? "true" : "false"}">${standalone ? "ホーム画面からアプリとして起動中" : "ブラウザで利用中"}</div>
    <p>ホーム画面に追加すると、阪大シャトルをアプリのようにすぐ開けます。</p>
    ${previewNote}
    <div class="pwa-actions">
      <button type="button" class="pwa-guide-button">追加方法を見る</button>
      <button type="button" class="pwa-refresh-button">最新版を確認</button>
    </div>
    <div class="pwa-install-guide">iPhone / iPad: Safariの共有ボタン →「ホーム画面に追加」→「追加」。<br>Android: Chromeのメニュー →「ホーム画面に追加」または「アプリをインストール」。</div>
    <p id="${STATUS_ID}" aria-live="polite"></p>`;
  if (sourceCard) sourceCard.before(card);
  else settings.append(card);

  const guide = card.querySelector(".pwa-install-guide");
  card.querySelector(".pwa-guide-button")?.addEventListener("click", () => guide?.classList.toggle("is-open"));
  card.querySelector(".pwa-refresh-button")?.addEventListener("click", () => void checkForAppUpdate({ force: true }));
}

async function autoCheckStandalone() {
  if (!isStandalone()) return;
  const meta = await fetchVersion().catch(() => null);
  if (!meta?.build) return;
  const previous = localStorage.getItem(BUILD_KEY) || "";
  if (!previous) {
    localStorage.setItem(BUILD_KEY, String(meta.build));
    return;
  }
  if (String(meta.build) !== previous) {
    await reloadAssets(meta);
    localStorage.setItem(BUILD_KEY, String(meta.build));
    reloadDocument(meta.build);
  }
}

function init() {
  installStyles();
  installSettingsCard();
  window.setTimeout(() => void autoCheckStandalone(), 650);
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
}
