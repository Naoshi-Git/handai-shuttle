const BRAND_ICON_URL = new URL("../assets/brand/brand-icon-rounded.svg", import.meta.url).href;
const DISPLAY_URL = "naoshi-git.github.io/handai-shuttle/";
const SHARE_CARD_WIDTH = 343;
const SHARE_STAGE_PADDING = 12;

function text(value, fallback = "") {
  return String(value || fallback).replace(/\s+/g, " ").trim();
}

function durationLabel(departure, arrival) {
  const parse = (value) => {
    const match = text(value).match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    return Number(match[1]) * 60 + Number(match[2]);
  };
  const start = parse(departure);
  const end = parse(arrival);
  if (start === null || end === null) return "";
  const minutes = end >= start ? end - start : end + 24 * 60 - start;
  return minutes > 0 ? `${minutes}分` : "";
}

function crowdingIcon(level) {
  const numericLevel = Math.min(5, Math.max(1, Number(level) || 1));
  const icon = document.createElement("span");
  icon.className = `crowding-icon crowding-lv${numericLevel}`;
  icon.dataset.crowdingBadge = "true";
  icon.dataset.crowdingLevel = String(numericLevel);
  icon.setAttribute("aria-hidden", "true");
  for (let index = 0; index < 5; index += 1) {
    const person = document.createElement("span");
    person.className = `crowding-person ${index < numericLevel ? "is-active" : ""}`;
    icon.append(person);
  }
  return icon;
}

function setNextCardData(card, data) {
  const liveDateOrCountdown = text(card.querySelector("#next-card-content .next-meta > span")?.textContent);
  card.querySelector("#next-share-button")?.remove();
  card.querySelector("#remaining-summary")?.remove();

  const label = card.querySelector(".card-label");
  if (label) label.textContent = text(data?.sourceLabel, "次の便");

  const routeType = card.querySelector("#next-route-type");
  if (routeType) routeType.textContent = text(data?.routeType, "運行便");

  const content = card.querySelector("#next-card-content");
  if (!content) throw new Error("Topカードの共有テンプレートを構成できませんでした");
  content.classList.remove("skeleton-block");

  const origin = text(data?.origin, "出発");
  const destination = text(data?.destination, "到着");
  const departure = text(data?.departure, "--:--");
  const arrival = text(data?.arrival, "--:--");
  const duration = text(data?.duration) || durationLabel(departure, arrival);
  const date = data?.sourceLabel === "次の便" && liveDateOrCountdown
    ? liveDateOrCountdown
    : text(data?.date);

  content.innerHTML = `
    <div class="next-route">
      <span>${origin}</span>
      <span class="arrow">→</span>
      <span>${destination}</span>
    </div>
    <div class="next-times">
      <span>${departure}</span><small>発</small>
      <span class="slash">/</span>
      <span>${arrival}</span><small>着</small>
    </div>
    <div class="next-meta next-meta-v4"></div>`;

  const meta = content.querySelector(".next-meta");
  const metaValues = [
    date,
    duration,
    text(data?.originDetail) ? `${text(data.originDetail).replace(/から$/, "")}から` : ""
  ].filter(Boolean);

  const textNodes = metaValues.map((value) => {
    const item = document.createElement("span");
    item.textContent = value;
    item.style.flex = "0 0 auto";
    item.style.maxWidth = "none";
    item.style.overflow = "visible";
    item.style.textOverflow = "clip";
    meta.append(item);
    return item;
  });
  meta.append(crowdingIcon(data?.crowdingLevel));

  // Only the stop-detail pill may shrink, but it must never stretch to fill the
  // row. Short values such as "30分" always keep their intrinsic width.
  const originItem = textNodes.at(-1);
  if (originItem && textNodes.length >= 3) {
    originItem.style.flex = "0 1 auto";
    originItem.style.minWidth = "0";
    originItem.style.maxWidth = "112px";
    originItem.style.overflow = "hidden";
    originItem.style.textOverflow = "ellipsis";
  }
}

function createPromo() {
  const promo = document.createElement("section");
  promo.setAttribute("aria-label", "阪大シャトルの案内");
  promo.style.cssText = [
    `box-sizing:border-box`,
    `width:${SHARE_CARD_WIDTH}px`,
    `margin-top:12px`,
    `padding:12px 13px`,
    `display:grid`,
    `grid-template-columns:38px minmax(0,1fr)`,
    `align-items:center`,
    `gap:10px`,
    `border-radius:16px`,
    `background:#fff`,
    `box-shadow:0 8px 24px rgba(24,24,30,.06)`,
    `color:#242429`
  ].join(";");

  const icon = document.createElement("img");
  icon.src = BRAND_ICON_URL;
  icon.alt = "";
  icon.width = 38;
  icon.height = 38;
  icon.style.cssText = "display:block;width:38px;height:38px";

  const copy = document.createElement("div");
  copy.style.cssText = "min-width:0;display:grid;gap:1px";

  const title = document.createElement("strong");
  title.textContent = "阪大シャトル";
  title.style.cssText = "font-size:13px;line-height:1.25;font-weight:800;color:#2d287f;white-space:nowrap";

  const tagline = document.createElement("span");
  tagline.textContent = "次の便・最終便・混雑目安を、すぐ確認。";
  tagline.style.cssText = "font-size:9.5px;line-height:1.4;font-weight:600;color:#5f5f69;white-space:nowrap";

  const url = document.createElement("span");
  url.textContent = DISPLAY_URL;
  url.style.cssText = "font-size:8.5px;line-height:1.35;font-weight:600;color:#85858e;white-space:nowrap";

  const disclaimer = document.createElement("span");
  disclaimer.textContent = "大阪大学 非公式Webアプリ";
  disclaimer.style.cssText = "font-size:8.5px;line-height:1.35;font-weight:600;color:#85858e;white-space:nowrap";

  copy.append(title, tagline, url, disclaimer);
  promo.append(icon, copy);
  return { promo, icon };
}

export async function mountShareSurface(data) {
  const source = document.querySelector("#next-card");
  if (!(source instanceof HTMLElement)) throw new Error("Topの次便カードが見つかりませんでした");

  const stage = document.createElement("div");
  stage.dataset.shareSnapshotSurface = "true";
  stage.style.cssText = [
    `position:fixed`,
    `left:-10000px`,
    `top:0`,
    `z-index:-1`,
    `box-sizing:border-box`,
    `width:${SHARE_CARD_WIDTH + SHARE_STAGE_PADDING * 2}px`,
    `padding:${SHARE_STAGE_PADDING}px`,
    `background:#f6f6f8`,
    `font-family:${getComputedStyle(document.body).fontFamily}`,
    `pointer-events:none`
  ].join(";");

  const card = source.cloneNode(true);
  card.style.width = `${SHARE_CARD_WIDTH}px`;
  card.style.minWidth = `${SHARE_CARD_WIDTH}px`;
  card.style.maxWidth = `${SHARE_CARD_WIDTH}px`;
  card.style.margin = "0";
  setNextCardData(card, data);

  const { promo, icon } = createPromo();
  stage.append(card, promo);
  document.body.append(stage);

  try {
    await icon.decode?.();
  } catch {
    // Same-origin brand art is decorative; a decode miss must not block share.
  }

  return {
    element: stage,
    cleanup() {
      stage.remove();
    }
  };
}

export { DISPLAY_URL, SHARE_CARD_WIDTH };
