#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PORT="${PORT:-8099}"
BASE_URL="${BASE_URL:-http://127.0.0.1:${PORT}}"
COOKIE_JAR="$(mktemp)"
SERVER_LOG="$(mktemp)"

cleanup() {
  if [[ -n "${SERVER_PID:-}" ]] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" >/dev/null 2>&1 || true
  fi
  rm -f "$COOKIE_JAR" "$SERVER_LOG"
}
trap cleanup EXIT

echo "[1/6] Checking PHP runtime"
command -v php >/dev/null
php -v | head -n 1
php -r 'foreach (["pdo_mysql","mbstring","openssl"] as $e) { if (!extension_loaded($e)) { fwrite(STDERR, "Missing extension: $e\n"); exit(1);} } echo "Required extensions: OK\n";'
php -r 'echo "PASSWORD_ARGON2ID: " . (defined("PASSWORD_ARGON2ID") ? "yes" : "no") . PHP_EOL;'

echo "[2/6] Running migrations"
php bin/migrate.php

echo "[3/6] Running seeds"
php bin/seed.php

echo "[4/6] Starting temporary API server on ${BASE_URL}"
php -S "127.0.0.1:${PORT}" -t public public/router.php >"$SERVER_LOG" 2>&1 &
SERVER_PID=$!
sleep 1

health_json="$(curl -sS "${BASE_URL}/api/health")"
python3 - <<'PY' "$health_json"
import json,sys
obj=json.loads(sys.argv[1])
assert obj.get("success") is True, obj
assert obj.get("data",{}).get("ok") is True, obj
print("Health endpoint: OK")
PY

echo "[5/6] Verifying session + CSRF + auth flow"
csrf_json="$(curl -sS -c "$COOKIE_JAR" -b "$COOKIE_JAR" "${BASE_URL}/api/auth/csrf")"
csrf_token="$(python3 - <<'PY' "$csrf_json"
import json,sys
obj=json.loads(sys.argv[1])
assert obj.get("success") is True, obj
print(obj.get("data",{}).get("csrfToken",""))
PY
)"

email="runtime.$(date +%s)@medqueue.local"
register_payload="{\"name\":\"Runtime Check\",\"email\":\"${email}\",\"phone\":\"+8801700000000\",\"password\":\"Runtime#12345\",\"condition\":\"N/A\"}"
register_json="$(curl -sS -c "$COOKIE_JAR" -b "$COOKIE_JAR" -H 'Content-Type: application/json' -H "X-CSRF-Token: ${csrf_token}" -X POST "${BASE_URL}/api/auth/register" -d "$register_payload")"
logout_token="$(python3 - <<'PY' "$register_json"
import json,sys
obj=json.loads(sys.argv[1])
assert obj.get("success") is True, obj
assert obj.get("data",{}).get("user",{}).get("role") == "patient", obj
print(obj.get("data",{}).get("csrfToken",""))
PY
)"

me_json="$(curl -sS -c "$COOKIE_JAR" -b "$COOKIE_JAR" "${BASE_URL}/api/auth/me")"
python3 - <<'PY' "$me_json"
import json,sys
obj=json.loads(sys.argv[1])
assert obj.get("success") is True, obj
assert obj.get("data",{}).get("user",{}).get("role") == "patient", obj
print("Session /auth/me: OK")
PY

logout_json="$(curl -sS -c "$COOKIE_JAR" -b "$COOKIE_JAR" -H 'Content-Type: application/json' -H "X-CSRF-Token: ${logout_token}" -X POST "${BASE_URL}/api/auth/logout" -d '{}')"
python3 - <<'PY' "$logout_json"
import json,sys
obj=json.loads(sys.argv[1])
assert obj.get("success") is True, obj
print("Logout with CSRF: OK")
PY

echo "[6/6] Verifying API contract aliases"
for p in /api/public/doctors /api/doctors /api/public/specialties /api/specialties; do
  body="$(curl -sS "${BASE_URL}${p}")"
  python3 - <<'PY' "$body" "$p"
import json,sys
obj=json.loads(sys.argv[1])
path=sys.argv[2]
assert obj.get("success") is True, f"{path} failed: {obj}"
print(f"{path}: OK")
PY
done

echo "Runtime verification completed successfully."
