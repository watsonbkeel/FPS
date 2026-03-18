#!/usr/bin/env bash
set -euo pipefail

export BASE_URL="${BASE_URL:-http://127.0.0.1:18427}"
UVICORN_HOST="${UVICORN_HOST:-0.0.0.0}"
UVICORN_PORT="${UVICORN_PORT:-18427}"
SERVER_PID=""

cleanup() {
  if [[ -n "${SERVER_PID}" ]] && ps -p "${SERVER_PID}" >/dev/null 2>&1; then
    kill "${SERVER_PID}" || true
  fi
}
trap cleanup EXIT

if [ ! -d ".venv" ]; then
  python3 -m venv .venv
fi

source .venv/bin/activate
pip install -U pip
pip install -r requirements.txt
playwright install chromium

python scripts/init_db.py

echo "[1/5] 检查服务是否已在运行..."
if curl -fsS "${BASE_URL}/health" >/dev/null 2>&1; then
  echo "已有运行中的服务，跳过启动。"
else
  echo "启动本地 uvicorn 服务..."
  python -m uvicorn app.main:app --host "${UVICORN_HOST}" --port "${UVICORN_PORT}" --log-level warning >/tmp/tamapet-uvicorn.log 2>&1 &
  SERVER_PID=$!
  for _ in {1..30}; do
    if curl -fsS "${BASE_URL}/health" >/dev/null 2>&1; then
      break
    fi
    sleep 0.5
  done
  if ! curl -fsS "${BASE_URL}/health" >/dev/null 2>&1; then
    echo "无法启动本地服务，查看 /tmp/tamapet-uvicorn.log" >&2
    exit 1
  fi
fi

echo "[2/5] 服务可访问，开始运行 E2E 测试..."
pytest tests/e2e -q

echo "[3/5] E2E 测试通过"

if [[ -n "${SERVER_PID}" ]]; then
  echo "[4/5] 停止本地 uvicorn 服务..."
  cleanup
else
  echo "[4/5] 保留已有服务运行"
fi

echo "[5/5] 完成"
