#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="staccato-frontend.service"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}"

FRONTEND_DIR="${FRONTEND_DIR:-/home/staccato/staccato-frontend/frontend-vm}"
NODE_BIN="${NODE_BIN:-$(command -v node || true)}"
NPM_BIN="${NPM_BIN:-$(command -v npm || true)}"

echo "=== STACCATO Frontend systemd installer ==="
echo "FRONTEND_DIR=${FRONTEND_DIR}"
echo "NODE_BIN=${NODE_BIN}"
echo "NPM_BIN=${NPM_BIN}"

if [[ -z "${NODE_BIN}" || ! -x "${NODE_BIN}" ]]; then
  echo "ERROR: node executable not found." >&2
  exit 1
fi

if [[ -z "${NPM_BIN}" || ! -x "${NPM_BIN}" ]]; then
  echo "ERROR: npm executable not found." >&2
  exit 1
fi

if [[ ! -f "${FRONTEND_DIR}/package.json" ]]; then
  echo "ERROR: package.json not found at ${FRONTEND_DIR}" >&2
  exit 1
fi

if [[ ! -d "${FRONTEND_DIR}/.next" ]]; then
  echo "ERROR: .next build output not found." >&2
  echo "Run first: cd ${FRONTEND_DIR} && npm run build" >&2
  exit 1
fi

NODE_DIR="$(dirname "${NODE_BIN}")"

echo "=== Stop old frontend process if exists ==="
sudo systemctl stop "${SERVICE_NAME}" 2>/dev/null || true
sudo fuser -k 3000/tcp || true
sleep 2

echo "=== Writing ${SERVICE_FILE} ==="
sudo tee "${SERVICE_FILE}" > /dev/null <<EOF
[Unit]
Description=STACCATO Frontend Next.js Server
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=staccato
WorkingDirectory=${FRONTEND_DIR}
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=HOSTNAME=127.0.0.1
Environment=PATH=${NODE_DIR}:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
ExecStart=${NPM_BIN} run start -- -H 127.0.0.1 -p 3000
Restart=always
RestartSec=5
KillSignal=SIGTERM
TimeoutStopSec=20
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

echo "=== Reload systemd ==="
sudo systemctl daemon-reload

echo "=== Enable ${SERVICE_NAME} ==="
sudo systemctl enable "${SERVICE_NAME}"

echo "=== Start ${SERVICE_NAME} ==="
sudo systemctl restart "${SERVICE_NAME}"

sleep 5

echo "=== Service status ==="
sudo systemctl status "${SERVICE_NAME}" --no-pager -l

echo "=== Local Next.js health ==="
curl -I http://127.0.0.1:3000
