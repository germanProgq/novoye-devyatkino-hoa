#!/usr/bin/env bash

set -Eeuo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root (example: sudo ./scripts/deploy_vps.sh)."
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="${APP_DIR:-$(cd "${SCRIPT_DIR}/.." && pwd)}"
ENV_FILE="${ENV_FILE:-$APP_DIR/.env}"
APP_URL="${APP_URL:-http://localhost:3000/}"
API_URL="${API_URL:-http://localhost:3000/backend/api/documents}"
DOMAIN="${DOMAIN:-}"
DOMAIN_SCHEME="${DOMAIN_SCHEME:-https}"
PUBLIC_APP_URL="${PUBLIC_APP_URL:-}"
PUBLIC_API_URL="${PUBLIC_API_URL:-}"
REQUIRE_PUBLIC_CHECK="${REQUIRE_PUBLIC_CHECK:-}"
REBOOT_THRESHOLD="${REBOOT_THRESHOLD:-5}"
CHECK_RETRIES="${CHECK_RETRIES:-30}"
CHECK_SLEEP_SECONDS="${CHECK_SLEEP_SECONDS:-3}"
DOCKER_BIN="$(command -v docker || true)"

if [[ -n "$DOMAIN" ]]; then
  PUBLIC_APP_URL="${PUBLIC_APP_URL:-${DOMAIN_SCHEME}://${DOMAIN}/}"
  PUBLIC_API_URL="${PUBLIC_API_URL:-${DOMAIN_SCHEME}://${DOMAIN}/backend/api/documents}"
fi

if [[ -z "$REQUIRE_PUBLIC_CHECK" ]]; then
  if [[ -n "$DOMAIN" || -n "$PUBLIC_APP_URL" || -n "$PUBLIC_API_URL" ]]; then
    REQUIRE_PUBLIC_CHECK="1"
  else
    REQUIRE_PUBLIC_CHECK="0"
  fi
fi

if [[ -z "$DOCKER_BIN" ]]; then
  echo "Docker is not installed. Install Docker + docker compose plugin first."
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "docker compose plugin not found. Install Docker Compose plugin first."
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required."
  exit 1
fi

if ! command -v systemctl >/dev/null 2>&1; then
  echo "systemd is required for auto-restart and self-heal timer."
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE. Copy .env.example to .env and set strong secrets first."
  exit 1
fi

if grep -Eiq 'CHANGE_ME|placeholder|example\.com' "$ENV_FILE"; then
  echo "$ENV_FILE still contains placeholder values. Replace them before deploy."
  exit 1
fi

get_env_value() {
  local file="$1"
  local key="$2"
  local line
  line="$(grep -E "^${key}=" "$file" | tail -n 1 || true)"
  printf '%s' "${line#*=}"
}

if [[ -f "$APP_DIR/.env.example" ]]; then
  for key in POSTGRES_PASSWORD HOA_DB_PASSWORD HOA_ADMIN_PASSWORD HOA_JWT_SECRET; do
    example_value="$(get_env_value "$APP_DIR/.env.example" "$key")"
    actual_value="$(get_env_value "$ENV_FILE" "$key")"
    if [[ -n "$example_value" && "$actual_value" == "$example_value" ]]; then
      echo "$ENV_FILE uses the example default for $key. Set a unique secret first."
      exit 1
    fi
  done
fi

log() {
  printf '[deploy-vps] %s\n' "$*"
}

check_url() {
  local url="$1"
  curl --silent --show-error --fail --max-time 12 "$url" >/dev/null
}

wait_for_stack() {
  local i
  for ((i = 1; i <= CHECK_RETRIES; i++)); do
    if check_url "$APP_URL" && check_url "$API_URL"; then
      if [[ "$REQUIRE_PUBLIC_CHECK" == "1" ]]; then
        if [[ -z "$PUBLIC_APP_URL" || -z "$PUBLIC_API_URL" ]]; then
          sleep "$CHECK_SLEEP_SECONDS"
          continue
        fi
        if ! check_url "$PUBLIC_APP_URL" || ! check_url "$PUBLIC_API_URL"; then
          sleep "$CHECK_SLEEP_SECONDS"
          continue
        fi
      fi
      log "Health checks passed."
      return 0
    fi
    sleep "$CHECK_SLEEP_SECONDS"
  done
  return 1
}

install_systemd_units() {
  local compose_service="/etc/systemd/system/hoa-compose.service"
  local heal_service="/etc/systemd/system/hoa-self-heal.service"
  local heal_timer="/etc/systemd/system/hoa-self-heal.timer"

  cat >"$compose_service" <<EOF
[Unit]
Description=HOA Docker Compose Stack
After=docker.service network-online.target
Requires=docker.service
Wants=network-online.target

[Service]
Type=oneshot
WorkingDirectory=$APP_DIR
ExecStart=$DOCKER_BIN compose up -d --remove-orphans
ExecStop=$DOCKER_BIN compose down
RemainAfterExit=yes
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

  cat >"$heal_service" <<EOF
[Unit]
Description=HOA Stack Self-Heal
After=hoa-compose.service
Requires=hoa-compose.service

[Service]
Type=oneshot
Environment=APP_DIR=$APP_DIR
Environment=APP_URL=$APP_URL
Environment=API_URL=$API_URL
Environment=PUBLIC_APP_URL=$PUBLIC_APP_URL
Environment=PUBLIC_API_URL=$PUBLIC_API_URL
Environment=REQUIRE_PUBLIC_CHECK=$REQUIRE_PUBLIC_CHECK
Environment=REBOOT_THRESHOLD=$REBOOT_THRESHOLD
ExecStart=/bin/bash $APP_DIR/scripts/self_heal.sh
EOF

  cat >"$heal_timer" <<'EOF'
[Unit]
Description=Run HOA self-heal every minute

[Timer]
OnBootSec=2min
OnUnitActiveSec=1min
Persistent=true
Unit=hoa-self-heal.service

[Install]
WantedBy=timers.target
EOF

  systemctl daemon-reload
  systemctl enable --now hoa-compose.service
  systemctl enable --now hoa-self-heal.timer
}

main() {
  log "Ensuring Docker daemon is running."
  systemctl enable --now docker

  chmod +x "$APP_DIR/scripts/self_heal.sh"

  log "Deploying stack from $APP_DIR."
  (
    cd "$APP_DIR"
    docker compose up -d --build --remove-orphans
  )

  log "Waiting for frontend and backend health endpoints."
  if ! wait_for_stack; then
    echo "Deployment failed health checks."
    echo "Local checks: $APP_URL and $API_URL"
    if [[ "$REQUIRE_PUBLIC_CHECK" == "1" ]]; then
      echo "Public checks: $PUBLIC_APP_URL and $PUBLIC_API_URL"
    fi
    exit 1
  fi

  log "Installing systemd auto-start and self-heal timer."
  install_systemd_units

  log "Running immediate self-heal validation."
  systemctl start hoa-self-heal.service

  log "Deploy complete."
  log "Local frontend: $APP_URL"
  log "Local health API via frontend proxy: $API_URL"
  if [[ "$REQUIRE_PUBLIC_CHECK" == "1" ]]; then
    log "Public frontend: $PUBLIC_APP_URL"
    log "Public health API via frontend proxy: $PUBLIC_API_URL"
  fi
  log "Services: hoa-compose.service + hoa-self-heal.timer"
}

main "$@"
