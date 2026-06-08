#!/usr/bin/env bash
set -euo pipefail

MODE="${1:---user}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

COMMANDS=(
  ai-on
  ai-off
  ai-status
  ai-log
)

if [[ "$MODE" == "--user" ]]; then
  TARGET_DIR="$HOME/bin"
  mkdir -p "$TARGET_DIR"

  for cmd in "${COMMANDS[@]}"; do
    install -m 0755 "$SCRIPT_DIR/$cmd" "$TARGET_DIR/$cmd"
  done

  if ! grep -q 'export PATH="$HOME/bin:$PATH"' "$HOME/.bashrc"; then
    echo 'export PATH="$HOME/bin:$PATH"' >> "$HOME/.bashrc"
  fi

  echo "Installed AI-vm control commands to $TARGET_DIR"
  echo "Run: source ~/.bashrc"
  echo "Commands: ai-on, ai-off, ai-status, ai-log"

elif [[ "$MODE" == "--system" ]]; then
  TARGET_DIR="/usr/local/bin"

  for cmd in "${COMMANDS[@]}"; do
    sudo install -m 0755 "$SCRIPT_DIR/$cmd" "$TARGET_DIR/$cmd"
  done

  echo "Installed AI-vm control commands to $TARGET_DIR"
  echo "Commands are available system-wide: ai-on, ai-off, ai-status, ai-log"

else
  echo "Usage: $0 [--user|--system]"
  exit 1
fi
