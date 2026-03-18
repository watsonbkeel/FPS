from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse, JSONResponse
from sqlalchemy.orm import Session

from ..constants import APPEARANCE_OPTIONS, GENDER_OPTIONS
from ..db import get_db
from ..services.auth_service import current_user
from ..services.dashboard_service import build_dashboard_context
from ..utils.web import redirect, template_context


router = APIRouter()


@router.get("/health")
def health_check():
    return JSONResponse({"status": "ok", "service": "tamapet"})


@router.get("/", response_class=HTMLResponse)
def homepage(request: Request, db: Session = Depends(get_db)):
    user = current_user(db, request)
    pets = build_dashboard_context(db, user, apply_hosting=False)["pets"] if user else []
    db.commit()
    return request.app.state.templates.TemplateResponse(
        "index.html",
        template_context(request, current_user=user, pets=pets),
    )


@router.get("/dashboard", response_class=HTMLResponse)
def dashboard(request: Request, db: Session = Depends(get_db)):
    user = current_user(db, request)
    if not user:
        return redirect("/login")

    dashboard_context = build_dashboard_context(db, user, apply_hosting=True)
    db.commit()
    return request.app.state.templates.TemplateResponse(
        "dashboard.html",
        template_context(
            request,
            current_user=user,
            **dashboard_context,
            gender_options=GENDER_OPTIONS,
            appearance_options=APPEARANCE_OPTIONS,
        ),
    )
