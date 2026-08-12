#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-.}"
PORT="${UI_BASELINE_PORT:-4173}"
TMP="$(mktemp -d)"
FIXTURE="$ROOT/.ui-baseline-fixture.html"
SERVER_PID=""

cleanup() {
  if [[ -n "$SERVER_PID" ]]; then kill "$SERVER_PID" 2>/dev/null || true; fi
  rm -f "$FIXTURE"
  rm -rf "$TMP"
}
trap cleanup EXIT

BROWSER=""
for candidate in google-chrome-stable google-chrome chromium chromium-browser; do
  if command -v "$candidate" >/dev/null 2>&1; then
    BROWSER="$(command -v "$candidate")"
    break
  fi
done

if [[ -z "$BROWSER" ]]; then
  echo "No supported Chrome/Chromium executable found" >&2
  exit 1
fi

cat > "$FIXTURE" <<'HTML'
<!doctype html>
<meta charset="utf-8">
<title>阪大シャトル UI baseline</title>
<pre id="result">RUNNING</pre>
<script>
const result = document.getElementById("result");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function waitFor(predicate, message, timeout = 6000) {
  const started = performance.now();
  while (performance.now() - started < timeout) {
    if (predicate()) return;
    await sleep(50);
  }
  throw new Error(message);
}

async function main() {
  localStorage.clear();
  localStorage.setItem("ou-bus:saved-routes", JSON.stringify([
    { origin: "suita", destination: "toyonaka", directOnly: true, savedAt: "2026-08-12T00:00:00.000Z" }
  ]));
  localStorage.setItem("ou-bus:favorite-trips", JSON.stringify([
    {
      source: "timetable",
      tripId: "E1便",
      departure: "08:00",
      arrival: "08:30",
      originName: "吹田",
      destinationName: "豊中",
      routeType: "直行",
      origin: "suita",
      destination: "toyonaka",
      originStop: "suita_engineering",
      destinationStop: "",
      directOnly: true,
      roundTrip: false,
      stayMinutes: 60,
      mode: "depart",
      date: "2026-06-01",
      savedAt: "2026-08-12T00:00:00.000Z"
    }
  ]));

  const frame = document.createElement("iframe");
  frame.id = "app-frame";
  frame.style.width = "390px";
  frame.style.height = "844px";
  document.body.append(frame);

  const loaded = new Promise((resolve) => frame.addEventListener("load", resolve, { once: true }));
  frame.src = "./?ui-baseline=1";
  await loaded;

  const doc = frame.contentDocument;
  await waitFor(() => doc.body?.classList.contains("app-ready"), "Opening did not reach app-ready");
  await waitFor(() => !doc.querySelector("#app-boot"), "Opening splash was not removed");
  await waitFor(() => doc.querySelector("link[data-ui-v3]"), "ui-v3 runtime stylesheet was not installed");
  await waitFor(() => doc.querySelector("#ui-v4-polish"), "ui-v4 polish runtime repair was not installed");
  await waitFor(() => doc.querySelector("#brand-assets-v2-style"), "brand runtime style was not installed");
  await waitFor(() => doc.querySelector("#timetable-route-controls"), "v3 timetable controls were not created");
  await waitFor(() => doc.querySelector("#result-stepper"), "search previous/next stepper was not created");
  await waitFor(() => doc.querySelector("#tt-detail-sheet"), "v4 timetable detail sheet was not created");
  await waitFor(() => doc.querySelector("#crowding-info-card"), "v4 crowding settings card was not created");
  await waitFor(() => doc.querySelector(".settings-disclosure"), "v12 settings information architecture was not created");
  await waitFor(() => doc.querySelector("#settings-menu-v13 .settings-nav-row-v13"), "v13 settings menu was not created");
  await waitFor(() => doc.querySelector("#saved-searches-v6 [data-open-search-save]"), "legacy saved route did not migrate to saved search");
  await waitFor(() => doc.querySelector("#favorite-trips-v6 [data-open-favorite]"), "favorite trip collection did not render");

  const migratedSearches = JSON.parse(localStorage.getItem("ou-bus:saved-searches") || "[]");
  const migratedFavorites = JSON.parse(localStorage.getItem("ou-bus:favorite-trips") || "[]");
  assert(migratedSearches.length === 1, "saved route migration did not persist one search");
  assert(migratedSearches[0].originStop === "suita_engineering", "saved route migration lost Suita origin stop default");
  assert(migratedFavorites[0]?.tripId === "E1", "favorite trip migration did not normalize tripId");
  assert(!doc.querySelector("#favorite-trips-v6")?.textContent.includes("便便"), "favorite trip label duplicated the 便 suffix");

  const stylesheetHrefs = [...doc.querySelectorAll('link[rel="stylesheet"]')].map((link) => link.getAttribute("href") || "");
  for (const required of ["./style.css", "./ui-v2.css", "./ui-v4.css", "./src/ui-system.css", "./ui-v3.css"]) {
    assert(stylesheetHrefs.includes(required), `required presentation layer missing: ${required}`);
  }

  assert(!doc.body.classList.contains("app-booting"), "body remained app-booting");
  assert(doc.querySelectorAll(".bottom-nav [data-nav]").length === 4, "bottom navigation lost an entry");
  assert(doc.querySelector("#home-destination-chips [data-home-destination]"), "Home destination choices were not rendered");
  assert(!doc.querySelector("#next-card-content")?.classList.contains("skeleton-block"), "Home remained in skeleton state");
  assert(doc.querySelector(".nav-glider-v15"), "current navigation glider was not created");

  async function openView(view) {
    const button = doc.querySelector(`.bottom-nav [data-nav="${view}"]`);
    assert(button, `missing nav button: ${view}`);
    button.click();
    await waitFor(
      () => doc.querySelector(`.view[data-view="${view}"].is-active`),
      `view did not activate: ${view}`,
      2500
    );
    await sleep(140);
  }

  await openView("search");
  assert(doc.querySelector("#search-form"), "Search form missing");
  assert(doc.querySelector("#result-stepper"), "Search stepper disappeared");
  const timingButton = doc.querySelector(".search-timing-button");
  const conditionButton = doc.querySelector(".search-condition-button");
  const timingSheet = doc.querySelector("#search-timing-sheet");
  const conditionSheet = doc.querySelector("#search-condition-sheet");
  assert(timingButton && conditionButton && timingSheet && conditionSheet, "v5 Search sheet controls missing");

  timingButton.click();
  await waitFor(() => timingSheet.open || timingSheet.hasAttribute("open"), "Search timing sheet did not open", 2500);
  timingSheet.querySelector(".search-sheet-done")?.click();
  await waitFor(() => !timingSheet.open && !timingSheet.hasAttribute("open"), "Search timing sheet did not close", 2500);

  conditionButton.click();
  await waitFor(() => conditionSheet.open || conditionSheet.hasAttribute("open"), "Search condition sheet did not open", 2500);
  conditionSheet.querySelector(".search-sheet-done")?.click();
  await waitFor(() => !conditionSheet.open && !conditionSheet.hasAttribute("open"), "Search condition sheet did not close", 2500);

  await openView("timetable");
  assert(doc.querySelector("#timetable-route-controls .tt-campus-tabs"), "Timetable campus tabs missing");
  await waitFor(() => doc.querySelector("#timetable-list .tt-compact-row"), "v4 compact timetable rows were not produced", 3500);
  const compactCard = doc.querySelector("#timetable-list .route-timetable-card[data-tt-trip]");
  const detailSheet = doc.querySelector("#tt-detail-sheet");
  assert(compactCard && detailSheet, "Timetable detail interaction target missing");
  compactCard.click();
  await waitFor(() => detailSheet.open || detailSheet.hasAttribute("open"), "Timetable detail sheet did not open", 2500);
  assert(detailSheet.querySelector("#tt-sheet-stops .tt-sheet-stop"), "Timetable detail stops were not rendered");
  detailSheet.querySelector(".tt-sheet-close")?.click();
  await waitFor(() => !detailSheet.open && !detailSheet.hasAttribute("open"), "Timetable detail sheet did not close", 2500);

  await openView("settings");
  assert(doc.querySelector("#debug-feedback-card"), "feedback card missing");
  assert(doc.querySelector("#crowding-info-card"), "crowding information card missing");
  assert(doc.querySelector(".settings-disclosure"), "settings disclosures missing");
  assert(doc.querySelector("#saved-searches-v6 [data-open-search-save]"), "saved search row missing in Settings");
  assert(doc.querySelector("#favorite-trips-v6 [data-open-favorite]"), "favorite row missing in Settings");

  doc.querySelector("#saved-searches-v6 [data-open-search-save]")?.click();
  await waitFor(() => doc.querySelector('#view-search.is-active'), "saved search did not reopen Search", 2500);
  await waitFor(() => doc.querySelector("#origin-campus")?.value === "suita" && doc.querySelector("#destination-campus")?.value === "toyonaka", "saved search did not restore route", 2500);

  await openView("settings");
  const settingsRow = doc.querySelector("#settings-menu-v13 .settings-nav-row-v13");
  assert(settingsRow, "Settings subpage row missing");
  settingsRow.click();
  await waitFor(() => doc.body.classList.contains("settings-subpage-open"), "Settings subpage did not open", 2500);
  const settingsPanel = doc.querySelector("#settings-subpage-v13");
  assert(settingsPanel?.getAttribute("aria-hidden") === "false", "Settings subpage remained hidden");
  settingsPanel.querySelector(".settings-subpage-back")?.click();
  await waitFor(() => !doc.body.classList.contains("settings-subpage-open"), "Settings subpage did not start closing", 2500);
  await waitFor(() => settingsPanel.getAttribute("aria-hidden") === "true", "Settings subpage did not close", 2500);

  await openView("home");
  assert(doc.querySelector("#view-home.is-active"), "Home did not restore");

  result.textContent = "PASS: boot + enhanced views + saved/favorite migration baseline";
}

main().catch((error) => {
  result.textContent = `FAIL: ${error.message}`;
  console.error(error);
});
</script>
HTML

python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$ROOT" >"$TMP/server.log" 2>&1 &
SERVER_PID=$!
sleep 0.6

DOM="$TMP/baseline.html"
STDERR="$TMP/browser.stderr"
"$BROWSER" \
  --headless=new \
  --no-sandbox \
  --disable-gpu \
  --disable-dev-shm-usage \
  --disable-background-networking \
  --user-data-dir="$TMP/profile" \
  --virtual-time-budget=16000 \
  --dump-dom "http://127.0.0.1:${PORT}/.ui-baseline-fixture.html" >"$DOM" 2>"$STDERR"

if ! grep -q "PASS: boot + enhanced views + saved/favorite migration baseline" "$DOM"; then
  echo "Browser UI baseline failed" >&2
  grep -o "FAIL: [^<]*" "$DOM" >&2 || true
  cat "$STDERR" >&2 || true
  exit 1
fi

echo "Browser UI baseline passed"
