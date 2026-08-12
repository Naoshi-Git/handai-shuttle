#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-.}"
PORT="${STYLE_INVENTORY_PORT:-4174}"
TMP="$(mktemp -d)"
FIXTURE="$ROOT/.style-inventory-fixture.html"
SERVER_PID=""

cleanup() {
  if [[ -n "$SERVER_PID" ]]; then kill "$SERVER_PID" 2>/dev/null || true; fi
  rm -f "$FIXTURE"
  rm -rf "$TMP"
}
trap cleanup EXIT

BROWSER=""
for candidate in google-chrome-stable google-chrome chromium chromium-browser; do
  if command -v "$candidate" >/dev/null 2>&1; then BROWSER="$(command -v "$candidate")"; break; fi
done
[[ -n "$BROWSER" ]] || { echo "No supported Chrome/Chromium executable found" >&2; exit 1; }

cat > "$FIXTURE" <<'HTML'
<!doctype html>
<meta charset="utf-8">
<pre id="result">RUNNING</pre>
<script>
const result = document.getElementById("result");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, timeout = 6000) {
  const start = performance.now();
  while (performance.now() - start < timeout) { if (fn()) return; await sleep(50); }
  throw new Error("style inventory timed out");
}
function sheetName(sheet) {
  if (sheet.href) return new URL(sheet.href).pathname.split("/").slice(-2).join("/");
  return sheet.ownerNode?.id ? `runtime:#${sheet.ownerNode.id}` : "runtime:<style>";
}
function matchingOwners(doc, element) {
  const owners = new Set();
  function walk(rules, owner) {
    for (const rule of [...rules]) {
      if (rule.cssRules) { try { walk(rule.cssRules, owner); } catch {} continue; }
      if (!rule.selectorText) continue;
      try { if (element.matches(rule.selectorText)) owners.add(owner); } catch {}
    }
  }
  for (const sheet of [...doc.styleSheets]) {
    try { walk(sheet.cssRules, sheetName(sheet)); } catch {}
  }
  return [...owners];
}
function snapshot(doc, selector) {
  const el = doc.querySelector(selector);
  if (!el) return { missing: true };
  const cs = getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  const props = ["display","position","font-size","font-weight","line-height","color","background-color","border-radius","box-shadow","padding-top","padding-right","padding-bottom","padding-left","gap","min-height","overflow","z-index"];
  const computed = Object.fromEntries(props.map((p) => [p, cs.getPropertyValue(p)]));
  return {
    owners: matchingOwners(doc, el),
    computed,
    geometry: { width: Math.round(rect.width), height: Math.round(rect.height) }
  };
}
async function openView(doc, view) {
  doc.querySelector(`.bottom-nav [data-nav="${view}"]`)?.click();
  await waitFor(() => doc.querySelector(`.view[data-view="${view}"].is-active`));
  await sleep(120);
}
async function main() {
  const frame = document.createElement("iframe");
  frame.style.width = "390px";
  frame.style.height = "844px";
  document.body.append(frame);
  const loaded = new Promise((r) => frame.addEventListener("load", r, { once: true }));
  frame.src = "./?style-inventory=1";
  await loaded;
  const doc = frame.contentDocument;
  await waitFor(() => doc.body?.classList.contains("app-ready"));
  await waitFor(() => doc.querySelector("#timetable-route-controls") && doc.querySelector("#settings-menu-v13"));

  const inventory = { viewport: "390x844", home: {}, search: {}, timetable: {}, settings: {} };
  inventory.home["#next-card"] = snapshot(doc, "#next-card");
  inventory.home["#next-card-content .next-meta"] = snapshot(doc, "#next-card-content .next-meta");
  inventory.home[".bottom-nav"] = snapshot(doc, ".bottom-nav");

  await openView(doc, "search");
  inventory.search["#search-form"] = snapshot(doc, "#search-form");
  inventory.search[".search-timing-button"] = snapshot(doc, ".search-timing-button");
  inventory.search["#result-stepper"] = snapshot(doc, "#result-stepper");

  await openView(doc, "timetable");
  await waitFor(() => doc.querySelector("#timetable-list .tt-compact-row"));
  inventory.timetable["#timetable-route-controls"] = snapshot(doc, "#timetable-route-controls");
  inventory.timetable[".route-timetable-card"] = snapshot(doc, ".route-timetable-card");
  inventory.timetable[".tt-compact-row"] = snapshot(doc, ".tt-compact-row");

  await openView(doc, "settings");
  inventory.settings["#settings-menu-v13"] = snapshot(doc, "#settings-menu-v13");
  inventory.settings[".settings-nav-row-v13"] = snapshot(doc, ".settings-nav-row-v13");
  inventory.settings["#crowding-info-card"] = snapshot(doc, "#crowding-info-card");

  result.textContent = `STYLE_INVENTORY:${JSON.stringify(inventory)}`;
}
main().catch((error) => { result.textContent = `STYLE_INVENTORY_ERROR:${error.message}`; });
</script>
HTML

python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$ROOT" >"$TMP/server.log" 2>&1 &
SERVER_PID=$!
sleep 0.6
DOM="$TMP/inventory.html"
"$BROWSER" --headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage --disable-background-networking --user-data-dir="$TMP/profile" --virtual-time-budget=10000 --dump-dom "http://127.0.0.1:${PORT}/.style-inventory-fixture.html" >"$DOM" 2>"$TMP/browser.stderr"

python3 - "$DOM" <<'PY'
import html, json, re, sys
text = open(sys.argv[1], encoding="utf-8").read()
match = re.search(r'<pre id="result">(.*?)</pre>', text, re.S)
if not match:
    raise SystemExit("style inventory result missing")
payload = html.unescape(match.group(1))
if payload.startswith("STYLE_INVENTORY_ERROR:"):
    raise SystemExit(payload)
if not payload.startswith("STYLE_INVENTORY:"):
    raise SystemExit("unexpected style inventory result")
data = json.loads(payload.split(":", 1)[1])
print("STYLE_INVENTORY_JSON=" + json.dumps(data, ensure_ascii=False, sort_keys=True, separators=(",", ":")))
PY
