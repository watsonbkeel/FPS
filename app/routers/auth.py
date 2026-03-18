from __future__ import annotations

from fastapi import APIRouter, Depends, Form, Request
from fastapi.responses import HTMLResponse
from pydantic import ValidationError
from sqlalchemy.orm import Session

from ..db import get_db
from ..schemas import LoginForm, RegisterForm
from ..services.auth_service import authenticate_user, create_user, current_user, get_user_by_email, login_user, logout_user
from ..utils.web import flash, redirect, template_context, verify_csrf


router = APIRouter()


@router.get("/register", response_class=HTMLResponse)
def register_page(request: Request, db: Session = Depends(get_db)):
    user = current_user(db, request)
    if user:
        return redirect("/dashboard")
    return request.app.state.templates.TemplateResponse("auth/register.html", template_context(request, current_user=None))


@router.post("/register")
def register_submit(
    request: Request,
    email: str = Form(...),
    password: str = Form(...),
    confirm_password: str = Form(...),
    csrf_token: str = Form(...),
    db: Session = Depends(get_db),
):
    verify_csrf(request, csrf_token)
    try:
        form = RegisterForm(email=email, password=password, confirm_password=confirm_password)
    except ValidationError as exc:
        flash(request, exc.errors()[0]["msg"], "error")
        return redirect("/register")

    if get_user_by_email(db, form.email):
        flash(request, "该邮箱已注册", "error")
        return redirect("/register")

    user = create_user(db, form.email, form.password)
    db.commit()
    login_user(request, user)
    flash(request, "注册成功，已自动登录", "success")
    return redirect("/dashboard")


@router.get("/login", response_class=HTMLResponse)
def login_page(request: Request, db: Session = Depends(get_db)):
    user = current_user(db, request)
    return request.app.state.templates.TemplateResponse("auth/login.html", template_context(request, current_user=user))


@router.post("/login")
def login_submit(
    request: Request,
    email: str = Form(...),
    password: str = Form(...),
    csrf_token: str = Form(...),
    db: Session = Depends(get_db),
):
    verify_csrf(request, csrf_token)
    try:
        form = LoginForm(email=email, password=password)
    except ValidationError as exc:
        flash(request, exc.errors()[0]["msg"], "error")
        return redirect("/login")

    user = authenticate_user(db, form.email, form.password)
    if not user:
        flash(request, "邮箱或密码错误", "error")
        return redirect("/login")

    login_user(request, user)
    flash(request, "登录成功", "success")
    return redirect("/dashboard")


@router.post("/logout")
def logout_submit(request: Request, csrf_token: str = Form(...)):
    verify_csrf(request, csrf_token)
    logout_user(request)
    flash(request, "已退出登录", "success")
    return redirect("/")
