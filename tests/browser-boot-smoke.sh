#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-.}"
PORT="${BOOT_SMOKE_PORT:-4173}"
TMP="$(mktemp -d)"
FIXTURE="$ROOT/.boot-smoke-invalid-storage.html"
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
<script>
  localStorage.setItem("ou-bus:default-campus", "legacy-invalid-campus");
  localStorage.setItem("ou-bus:suita-origin-stop", "legacy-invalid-stop");
  location.replace("./?boot-smoke=legacy-storage");
</script>
HTML

python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$ROOT" >"$TMP/server.log" 2>&1 &
SERVER_PID=$!
sleep 0.6

BASE="http://127.0.0.1:${PORT}/"

run_case() {
  local name="$1"
  local url="$2"
  local profile="$TMP/profile-$name"
  local dom="$TMP/$name.html"
  local stderr="$TMP/$name.stderr"

  "$BROWSER" \
    --headless=new \
    --no-sandbox \
    --disable-gpu \
    --disable-dev-shm-usage \
    --disable-background-networking \
    --user-data-dir="$profile" \
    --virtual-time-budget=5000 \
    --dump-dom "$url" >"$dom" 2>"$stderr"

  if ! grep -Eq '<body[^>]*class="[^"]*app-ready' "$dom"; then
    echo "[$name] body never reached app-ready" >&2
    cat "$stderr" >&2 || true
    exit 1
  fi
  if grep -Eq '<body[^>]*class="[^"]*app-booting' "$dom"; then
    echo "[$name] body remained app-booting" >&2
    exit 1
  fi
  if grep -Eq 'id="next-route-type"[^>]*>検索中<' "$dom"; then
    echo "[$name] Home remained in the initial loading state" >&2
    exit 1
  fi
  if grep -Eq 'id="app-boot"' "$dom"; then
    echo "[$name] boot splash was not removed" >&2
    exit 1
  fi

  echo "[$name] browser boot smoke passed"
}

run_case "fresh" "${BASE}?boot-smoke=fresh"
run_case "legacy-storage" "${BASE}.boot-smoke-invalid-storage.html"
