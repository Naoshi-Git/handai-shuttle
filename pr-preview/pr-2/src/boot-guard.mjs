const root = document.documentElement;
const body = document.body;

let released = body?.classList.contains("app-ready") === true;

function releaseBoot() {
  if (released) return;
  released = true;
  body?.classList.remove("app-booting");
  body?.classList.add("app-ready");
  const boot = document.getElementById("app-boot");
  window.setTimeout(() => boot?.remove(), 320);
}

// Boot visibility must never depend on a later UI compatibility layer completing.
// ui-v12 may release earlier after fonts are ready; this is the hard safety ceiling.
const maximumMs = Math.max(900, Number(root?.dataset.bootMaxMs || 1400));
window.setTimeout(releaseBoot, maximumMs + 120);

window.addEventListener("error", () => {
  // Surface the usable base app even if a non-critical enhancement throws during startup.
  window.setTimeout(releaseBoot, 0);
}, { once: true });

window.addEventListener("unhandledrejection", () => {
  window.setTimeout(releaseBoot, 0);
}, { once: true });

export { releaseBoot };
