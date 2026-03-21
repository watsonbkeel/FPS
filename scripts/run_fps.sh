#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/root/tamapet}"
FPS_PORT="${FPS_PORT:-18428}"

cd "$PROJECT_DIR"
source .venv/bin/activate

exec python -m uvicorn app.fps_main:app --host 0.0.0.0 --port "$FPS_PORT"
