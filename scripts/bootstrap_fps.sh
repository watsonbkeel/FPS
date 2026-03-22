#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/root/tamapet}"
FPS_PORT="${FPS_PORT:-18428}"

cd "$PROJECT_DIR"

if [ ! -d ".venv" ]; then
  python3 -m venv .venv
fi

source .venv/bin/activate
pip install -U pip
pip install -r requirements.txt
playwright install chromium

if [ -f ".env.example" ] && [ ! -f ".env" ]; then
  cp .env.example .env
fi

echo "Standalone FPS 环境初始化完成。"
echo "启动命令："
echo "source .venv/bin/activate && ./scripts/run_fps.sh"
echo
echo "健康检查："
echo "curl http://127.0.0.1:${FPS_PORT}/health"
echo
echo "E2E 测试："
echo "./scripts/run_fps_e2e.sh"
