#!/usr/bin/env bash

set -Eeuo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
APP_URL="${APP_URL:-http://localhost:3000/}"
API_URL="${API_URL:-http://localhost:3000/backend/api/documents}"
PUBLIC_APP_URL="${PUBLIC_APP_URL:-}"
PUBLIC_API_URL="${PUBLIC_API_URL:-}"
REQUIRE_PUBLIC_CHECK="${REQUIRE_PUBLIC_CHECK:-0}"
FAILURE_STATE_DIR="${FAILURE_STATE_DIR:-/var/lib/hoa-self-heal}"
FAILURE_STATE_FILE="${FAILURE_STATE_DIR}/consecutive_failures"
REBOOT_THRESHOLD="${REBOOT_THRESHOLD:-5}"
HEAL_WAIT_SECONDS="${HEAL_WAIT_SECONDS:-12}"

log() {
  printf '[hoa-self-heal] %s\n' "$*"
}

check_endpoint() {
  local url="$1"
  curl --silent --show-error --fail --max-time 12 "$url" >/dev/null
}

check_stack() {
  check_endpoint "$APP_URL" && check_endpoint "$API_URL"

  if [[ "$REQUIRE_PUBLIC_CHECK" == "1" ]]; then
    [[ -n "$PUBLIC_APP_URL" ]] || {
      log "REQUIRE_PUBLIC_CHECK=1 but PUBLIC_APP_URL is empty."
      return 1
    }
    [[ -n "$PUBLIC_API_URL" ]] || {
      log "REQUIRE_PUBLIC_CHECK=1 but PUBLIC_API_URL is empty."
      return 1
    }
    check_endpoint "$PUBLIC_APP_URL" && check_endpoint "$PUBLIC_API_URL"
  fi
}

read_failures() {
  if [[ -f "$FAILURE_STATE_FILE" ]]; then
    cat "$FAILURE_STATE_FILE"
  else
    echo "0"
  fi
}

write_failures() {
  local value="$1"
  mkdir -p "$FAILURE_STATE_DIR"
  printf '%s' "$value" >"$FAILURE_STATE_FILE"
}

ensure_stack_running() {
  (
    cd "$APP_DIR"
    docker compose up -d --remove-orphans
  )
}

main() {
  if check_stack; then
    write_failures 0
    log "Healthcheck passed."
    exit 0
  fi

  local failures
  failures=$(( $(read_failures) + 1 ))
  write_failures "$failures"
  log "Healthcheck failed (consecutive failures: $failures). Attempting recovery."

  ensure_stack_running
  sleep "$HEAL_WAIT_SECONDS"

  if check_stack; then
    write_failures 0
    log "Recovery successful."
    exit 0
  fi

  log "Recovery attempt failed."
  if (( failures >= REBOOT_THRESHOLD )); then
    write_failures 0
    log "Failure threshold reached ($REBOOT_THRESHOLD). Rebooting host."
    /sbin/reboot
  fi

  exit 1
}

main "$@"
