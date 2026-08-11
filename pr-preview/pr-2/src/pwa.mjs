const BUILD_KEY = "handai-shuttle:last-build";
const INSTALL_NUDGE_DISMISS_KEY = "handai-shuttle:install-nudge-dismissed-v1";

export function isStandalone() {
  return window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true;
}

export function isPreviewBuild() {
  return /\/pr-preview\/pr-\d+\//.test(window.location.pathname);
}

async function fetchVersion() {
  const url = new URL("./version.json", window.location.href);
  url.searchParams.set("_", String(Date.now()));
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`version.json ${response.status}`);
  return response.json();
}

async function reloadAssets(meta) {
  const assets = Array.isArray(meta?.assets) ? meta.assets : [];
  const reloadable = assets.filter((path) => /\.(?:html|css|js|mjs|json|webmanifest|svg|png|webp|jpe?g)$/i.test(path));
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
  try {
    const meta = await fetchVersion();
    const current = String(meta?.build || "");
    const previous = localStorage.getItem(BUILD_KEY) || "";
    const changed = Boolean(current && previous && current !== previous);

    if (force || changed) {
      await reloadAssets(meta);
      if (current) localStorage.setItem(BUILD_KEY, current);
      if (reload) reloadDocument(current);
      return { updated: true, build: current };
    }

    if (current) localStorage.setItem(BUILD_KEY, current);
    return { updated: false, build: current };
  } catch (error) {
    console.warn("Handai Shuttle update check failed", error);
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
    .pwa-install-guide{display:block;margin:0;padding:10px 12px;border:1px solid #dfddeb;border-radius:12px;background:#fff;color:var(--ink);font-size:10.5px;line-height:1.7}
    .pwa-install-guide.is-open{display:block}
    .pwa-install-nudge{position:fixed;z-index:1100;left:50%;bottom:calc(var(--ui-nav-height,58px) + 20px + env(safe-area-inset-bottom));transform:translateX(-50%);width:min(calc(100% - 28px),480px);display:grid;grid-template-columns:minmax(0,1fr) 34px;align-items:center;gap:6px;padding:7px;border:1px solid rgba(255,255,255,.72);border-radius:19px;background:rgba(250,250,252,.9);box-shadow:0 10px 28px rgba(28,27,54,.16);-webkit-backdrop-filter:blur(22px) saturate(155%);backdrop-filter:blur(22px) saturate(155%)}
    .pwa-install-nudge-main{min-width:0;display:grid;grid-template-columns:36px minmax(0,1fr) auto;align-items:center;gap:9px;padding:4px 7px 4px 4px;border:0;background:transparent;color:var(--ink);text-align:left}
    .pwa-install-nudge-main img{width:36px;height:36px;border-radius:10px}
    .pwa-install-nudge-copy{display:grid;gap:2px;min-width:0}
    .pwa-install-nudge-copy strong{font-size:11.5px;line-height:1.2}
    .pwa-install-nudge-copy small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--muted);font-size:9.5px;line-height:1.2}
    .pwa-install-nudge-cta{padding:6px 9px;border-radius:999px;background:#ecebf7;color:var(--ou-900);font-size:9.5px;font-weight:800}
    .pwa-install-nudge-close{width:32px;height:32px;padding:0;border:0;border-radius:50%;background:transparent;color:#777780;font-size:20px;line-height:1}
    @media(max-width:360px){.pwa-install-nudge-copy small{display:none}.pwa-install-nudge-main{grid-template-columns:34px minmax(0,1fr) auto}.pwa-install-nudge-main img{width:34px;height:34px}}
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
  card.innerHTML = `
    <h3>ホーム画面に追加</h3>
    <div class="pwa-settings-state" data-installed="${standalone ? "true" : "false"}">${standalone ? "ホーム画面からアプリとして起動中" : "Safariからホーム画面に追加できます"}</div>
    <p>ホーム画面に追加すると、阪大シャトルをアプリのようにすぐ開けます。</p>
    <div class="pwa-install-guide is-open">iPhone / iPad: Safariの共有ボタン →「ホーム画面に追加」→「追加」。</div>`;
  if (sourceCard) sourceCard.before(card);
  else settings.append(card);
}

function isIosDevice() {
  const ua = navigator.userAgent || "";
  return /iP(?:hone|ad|od)/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isSafariBrowser() {
  const ua = navigator.userAgent || "";
  return /Safari/i.test(ua) && !/(CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo)/i.test(ua);
}

export function shouldShowInstallNudge() {
  if (isStandalone() || !isIosDevice() || !isSafariBrowser()) return false;
  try { return localStorage.getItem(INSTALL_NUDGE_DISMISS_KEY) !== "1"; } catch { return true; }
}

function dismissInstallNudge() {
  document.querySelector("[data-pwa-install-nudge]")?.remove();
  try { localStorage.setItem(INSTALL_NUDGE_DISMISS_KEY, "1"); } catch { /* storage unavailable */ }
}

function openInstallGuideFromNudge() {
  document.querySelector("[data-pwa-install-nudge]")?.remove();
  document.querySelector('[data-nav="settings"]')?.click();
  const openRow = () => {
    const row = [...document.querySelectorAll(".settings-nav-row-v13")]
      .find((button) => button.querySelector("strong")?.textContent?.trim() === "ホーム画面に追加");
    row?.click();
    return Boolean(row);
  };
  window.setTimeout(openRow, 60);
  window.setTimeout(openRow, 220);
}

function installSafariNudge() {
  if (!shouldShowInstallNudge() || document.querySelector("[data-pwa-install-nudge]")) return;
  const nudge = document.createElement("aside");
  nudge.className = "pwa-install-nudge";
  nudge.dataset.pwaInstallNudge = "true";
  nudge.setAttribute("aria-label", "ホーム画面に追加");
  nudge.innerHTML = `
    <button type="button" class="pwa-install-nudge-main" data-pwa-install-open>
      <img src="./assets/brand/app-icon-180.png" width="36" height="36" alt="">
      <span class="pwa-install-nudge-copy"><strong>ホーム画面に追加</strong><small>アプリのように、すぐ開けます</small></span>
      <span class="pwa-install-nudge-cta">見る</span>
    </button>
    <button type="button" class="pwa-install-nudge-close" data-pwa-install-dismiss aria-label="この案内を閉じる">×</button>`;
  document.body.append(nudge);
  nudge.querySelector("[data-pwa-install-open]")?.addEventListener("click", openInstallGuideFromNudge);
  nudge.querySelector("[data-pwa-install-dismiss]")?.addEventListener("click", dismissInstallNudge);
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
  window.setTimeout(installSafariNudge, 1350);
  window.setTimeout(() => void autoCheckStandalone(), 650);
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
}
