#!/usr/bin/env bash

set -Eeuo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root (example: sudo ./scripts/deploy_vps.sh)."
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="${APP_DIR:-$(cd "${SCRIPT_DIR}/.." && pwd)}"
APP_URL="${APP_URL:-http://localhost:3000/}"
API_URL="${API_URL:-http://localhost:3000/backend/api/documents}"
REBOOT_THRESHOLD="${REBOOT_THRESHOLD:-5}"
CHECK_RETRIES="${CHECK_RETRIES:-30}"
CHECK_SLEEP_SECONDS="${CHECK_SLEEP_SECONDS:-3}"
DOCKER_BIN="$(command -v docker || true)"

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
    echo "Deployment failed health checks for $APP_URL and/or $API_URL."
    exit 1
  fi

  log "Installing systemd auto-start and self-heal timer."
  install_systemd_units

  log "Running immediate self-heal validation."
  systemctl start hoa-self-heal.service

  log "Deploy complete."
  log "Frontend: $APP_URL"
  log "Health API via frontend proxy: $API_URL"
  log "Services: hoa-compose.service + hoa-self-heal.timer"
}

main "$@"
