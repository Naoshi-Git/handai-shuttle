export const APP_ICON_32 = "./assets/brand/app-icon-32.png";
export const APP_ICON_180 = "./assets/brand/app-icon-180.png";

export function ensureShareIdentity() {
  if (typeof document === "undefined") return;

  let favicon = document.head.querySelector('link[rel="icon"][sizes="32x32"]');
  if (!favicon) {
    favicon = document.createElement("link");
    favicon.rel = "icon";
    document.head.append(favicon);
  }
  favicon.href = APP_ICON_32;
  favicon.type = "image/png";
  favicon.setAttribute("sizes", "32x32");

  let appleTouch = document.head.querySelector('link[rel="apple-touch-icon"]');
  if (!appleTouch) {
    appleTouch = document.createElement("link");
    appleTouch.rel = "apple-touch-icon";
    document.head.append(appleTouch);
  }
  appleTouch.href = APP_ICON_180;
  appleTouch.setAttribute("sizes", "180x180");
}

export function shareLandingUrl() {
  if (typeof window === "undefined") return "https://naoshi-git.github.io/handai-shuttle/share.html";
  const base = new URL(window.location.href);
  base.hash = "";
  base.search = "";
  if (!base.pathname.endsWith("/")) base.pathname = base.pathname.replace(/[^/]*$/, "");
  return new URL("share.html", base).toString();
}
