const BRAND_ICON = "./assets/brand/brand-icon-rounded.svg";
const APP_ICON = "./assets/brand/app-icon.svg";

function ensureHeadLink(rel, href, type = "") {
  let link = document.head.querySelector(`link[rel="${rel}"]`);
  if (!link) {
    link = document.createElement("link");
    link.rel = rel;
    document.head.append(link);
  }
  link.href = href;
  if (type) link.type = type;
}

function installBrandStyles() {
  if (document.getElementById("brand-assets-v2-style")) return;
  const style = document.createElement("style");
  style.id = "brand-assets-v2-style";
  style.textContent = `
    .brand-mark {
      background: transparent !important;
      box-shadow: none !important;
      overflow: visible;
      flex: 0 0 42px;
    }
    .brand-mark img {
      display: block;
      width: 42px;
      height: 42px;
      aspect-ratio: 1 / 1;
      object-fit: contain;
    }
  `;
  document.head.append(style);
}

function installBrand() {
  ensureHeadLink("icon", APP_ICON, "image/svg+xml");
  ensureHeadLink("apple-touch-icon", APP_ICON);
  installBrandStyles();

  const mark = document.querySelector(".brand-mark");
  if (mark && !mark.querySelector("img")) {
    mark.textContent = "";
    const image = document.createElement("img");
    image.src = BRAND_ICON;
    image.alt = "";
    image.width = 42;
    image.height = 42;
    image.decoding = "async";
    mark.append(image);
  }

  const eyebrow = document.querySelector(".topbar .eyebrow");
  if (eyebrow) eyebrow.textContent = "HANDAI SHUTTLE";
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", installBrand, { once: true });
} else {
  installBrand();
}
