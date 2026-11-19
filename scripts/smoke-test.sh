#!/usr/bin/env bash
set -euo pipefail

PORT="${SMOKE_TEST_PORT:-3217}"
BASE_URL="http://127.0.0.1:${PORT}"
TEMP_DIR="$(mktemp -d)"
LOG_FILE="${TEMP_DIR}/server.log"
SERVER_PID=""

cleanup() {
  if [[ -n "$SERVER_PID" ]] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill -TERM "$SERVER_PID" 2>/dev/null || true
    for _ in {1..30}; do
      kill -0 "$SERVER_PID" 2>/dev/null || break
      sleep 0.1
    done
    kill -KILL "$SERVER_PID" 2>/dev/null || true
  fi
  if [[ -n "$SERVER_PID" ]]; then
    wait "$SERVER_PID" 2>/dev/null || true
  fi
  rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

HOST=127.0.0.1 PORT="$PORT" node backend/server.mjs >"$LOG_FILE" 2>&1 &
SERVER_PID=$!

echo "Waiting for the production server..."
READY=false
for _ in {1..60}; do
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    cat "$LOG_FILE"
    echo "::error::Production server exited before becoming ready."
    exit 1
  fi
  if curl --fail --silent "$BASE_URL/api/health" -o "$TEMP_DIR/health.json"; then
    READY=true
    break
  fi
  sleep 0.25
done

if [[ "$READY" != true ]]; then
  cat "$LOG_FILE"
  echo "::error::Production server did not become ready within 15 seconds."
  exit 1
fi

jq --exit-status '.status == "ok" and .service == "arrowera-error-mechanism"' \
  "$TEMP_DIR/health.json"

echo "Checking the production frontend..."
curl --fail --silent --show-error "$BASE_URL/" -o "$TEMP_DIR/index.html"
grep -Fq '<title>ArrowEra · Error Mechanism</title>' "$TEMP_DIR/index.html"
curl --fail --silent --show-error "$BASE_URL/arrow.svg" -o /dev/null

echo "Checking the analysis API..."
curl --fail --silent --show-error \
  -H 'Content-Type: application/json' \
  -d '{"input":"TypeError: Cannot read properties of undefined (reading map)"}' \
  "$BASE_URL/api/analyze" -o "$TEMP_DIR/analysis.json"

jq --exit-status 'type == "object" and length > 0' "$TEMP_DIR/analysis.json"

echo "Production smoke test passed: health, frontend, favicon, and analysis API."
