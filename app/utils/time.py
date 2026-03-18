from __future__ import annotations

from datetime import datetime


def now_utc() -> datetime:
    return datetime.utcnow()
