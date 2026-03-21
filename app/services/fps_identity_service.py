from __future__ import annotations

import secrets
from dataclasses import dataclass


FPS_NICKNAME_SESSION_KEY = "fps_nickname"
FPS_USER_ID_SESSION_KEY = "fps_user_id"


@dataclass(slots=True)
class FpsIdentity:
    user_id: int
    nickname: str


def _next_fps_user_id() -> int:
    return 100_000_000 + secrets.randbelow(900_000_000)


def current_fps_identity(request) -> FpsIdentity | None:
    nickname = request.session.get(FPS_NICKNAME_SESSION_KEY)
    user_id = request.session.get(FPS_USER_ID_SESSION_KEY)
    if not nickname or not isinstance(user_id, int):
        return None
    return FpsIdentity(user_id=user_id, nickname=nickname)


def login_fps_identity(request, nickname: str) -> FpsIdentity:
    identity = current_fps_identity(request)
    user_id = identity.user_id if identity else _next_fps_user_id()
    request.session[FPS_NICKNAME_SESSION_KEY] = nickname
    request.session[FPS_USER_ID_SESSION_KEY] = user_id
    return FpsIdentity(user_id=user_id, nickname=nickname)


def logout_fps_identity(request) -> None:
    request.session.pop(FPS_NICKNAME_SESSION_KEY, None)
    request.session.pop(FPS_USER_ID_SESSION_KEY, None)
