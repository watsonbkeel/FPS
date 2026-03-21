from __future__ import annotations

from fastapi import HTTPException, Request
from fastapi.responses import RedirectResponse

from ..config import settings
from .security import generate_token


def ensure_csrf_token(request: Request) -> str:
    token = request.session.get("csrf_token")
    if not token:
        token = generate_token()
        request.session["csrf_token"] = token
    return token


def verify_csrf(request: Request, token: str | None) -> None:
    expected = ensure_csrf_token(request)
    if not token or token != expected:
        raise HTTPException(status_code=403, detail="CSRF 校验失败")


def flash(request: Request, message: str, category: str = "info") -> None:
    flashes = request.session.setdefault("flashes", [])
    flashes.append({"message": message, "category": category})
    request.session["flashes"] = flashes


def pop_flashes(request: Request) -> list[dict[str, str]]:
    flashes = request.session.pop("flashes", [])
    return flashes


def template_context(request: Request, **kwargs):
    context = {
        "request": request,
        "csrf_token": ensure_csrf_token(request),
        "flashes": pop_flashes(request),
        "fps_public_base_url": settings.fps_public_base_url,
    }
    context.update(kwargs)
    return context


def redirect(url: str) -> RedirectResponse:
    return RedirectResponse(url=url, status_code=303)
