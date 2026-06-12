#!/usr/bin/env bash
# ai-on/ai-off/ai-status/ai-log 명령을 사용자 또는 시스템 경로에 설치하는 스크립트입니다.
set -euo pipefail

# 인자가 없으면 현재 사용자 전용 설치 모드로 동작합니다.
MODE="${1:---user}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 설치 대상 제어 명령 목록입니다.
COMMANDS=(
  ai-on
  ai-off
  ai-status
  ai-log
)

# --user 모드는 HOME/bin에 설치하고 bash PATH를 보강합니다.
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

# --system 모드는 /usr/local/bin에 sudo로 설치합니다.
elif [[ "$MODE" == "--system" ]]; then
  TARGET_DIR="/usr/local/bin"

  for cmd in "${COMMANDS[@]}"; do
    sudo install -m 0755 "$SCRIPT_DIR/$cmd" "$TARGET_DIR/$cmd"
  done

  echo "Installed AI-vm control commands to $TARGET_DIR"
  echo "Commands are available system-wide: ai-on, ai-off, ai-status, ai-log"

# 지원하지 않는 인자는 사용법을 출력하고 실패 처리합니다.
else
  echo "Usage: $0 [--user|--system]"
  exit 1
fi
