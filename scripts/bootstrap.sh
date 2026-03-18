#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/root/tamapet}"
PORT="${PORT:-18427}"

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

python scripts/init_db.py

echo "初始化完成。"
echo "开发启动命令："
echo "source .venv/bin/activate && uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"
echo
echo "健康检查："
echo "curl http://127.0.0.1:${PORT}/health"
echo
echo "E2E 测试："
echo "./scripts/run_e2e.sh"
