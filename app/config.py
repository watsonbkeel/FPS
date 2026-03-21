from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = BASE_DIR / ".env"

if ENV_FILE.exists():
    load_dotenv(ENV_FILE)


def _get_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _get_fps_public_base_url() -> str:
    configured = os.getenv("FPS_PUBLIC_BASE_URL")
    if configured:
        return configured.rstrip("/") or configured
    port = os.getenv("FPS_PORT", "18428")
    return f"http://127.0.0.1:{port}"


@dataclass(slots=True)
class Settings:
    app_name: str = os.getenv("APP_NAME", "Tamapet")
    fps_app_name: str = os.getenv("FPS_APP_NAME", "Tamapet FPS")
    app_env: str = os.getenv("APP_ENV", "development")
    secret_key: str = os.getenv("SECRET_KEY", "change-me")
    session_cookie_name: str = os.getenv("SESSION_COOKIE_NAME", "tamapet_session")
    fps_session_cookie_name: str = os.getenv("FPS_SESSION_COOKIE_NAME", "tamapet_fps_session")
    base_url: str = os.getenv("BASE_URL", "http://127.0.0.1:18427")
    host: str = os.getenv("HOST", "0.0.0.0")
    port: int = int(os.getenv("PORT", "18427"))
    fps_port: int = int(os.getenv("FPS_PORT", "18428"))
    fps_public_base_url: str = _get_fps_public_base_url()
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./tamapet.db")
    seed_demo: bool = _get_bool("SEED_DEMO", True)


settings = Settings()
