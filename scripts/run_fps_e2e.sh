#!/usr/bin/env bash
set -euo pipefail

export FPS_BASE_URL="${FPS_BASE_URL:-http://127.0.0.1:18428}"
UVICORN_HOST="${UVICORN_HOST:-0.0.0.0}"
FPS_PORT="${FPS_PORT:-18428}"
FPS_SERVER_PID=""

cleanup() {
  if [[ -n "${FPS_SERVER_PID}" ]] && ps -p "${FPS_SERVER_PID}" >/dev/null 2>&1; then
    kill "${FPS_SERVER_PID}" || true
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

export FPS_PUBLIC_BASE_URL="${FPS_BASE_URL}"

echo "[1/4] 检查 Standalone FPS 服务是否已在运行..."
if curl -fsS "${FPS_BASE_URL}/health" >/dev/null 2>&1; then
  echo "已有运行中的 FPS 服务，跳过启动。"
else
  echo "启动本地 Standalone FPS 服务..."
  python -m uvicorn app.fps_main:app --host "${UVICORN_HOST}" --port "${FPS_PORT}" --log-level warning >/tmp/voxel-fps-uvicorn.log 2>&1 &
  FPS_SERVER_PID=$!
  for _ in {1..30}; do
    if curl -fsS "${FPS_BASE_URL}/health" >/dev/null 2>&1; then
      break
    fi
    sleep 0.5
  done
  if ! curl -fsS "${FPS_BASE_URL}/health" >/dev/null 2>&1; then
    echo "无法启动 Standalone FPS 服务，查看 /tmp/voxel-fps-uvicorn.log" >&2
    exit 1
  fi
fi

echo "[2/4] 服务可访问，开始运行 FPS E2E 测试..."
pytest tests/fps_e2e -q

echo "[3/4] FPS E2E 测试通过"

if [[ -n "${FPS_SERVER_PID}" ]]; then
  echo "[4/4] 停止本地 FPS 服务..."
  cleanup
else
  echo "[4/4] 保留已有 FPS 服务运行"
fi
