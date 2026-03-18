from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import User
from ..utils.security import hash_password, verify_password


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == email.strip().lower()))


def create_user(db: Session, email: str, password: str) -> User:
    user = User(email=email.strip().lower(), password_hash=hash_password(password))
    db.add(user)
    db.flush()
    return user


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    user = get_user_by_email(db, email)
    if not user:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


def current_user(db: Session, request) -> User | None:
    user_id = request.session.get("user_id")
    if not user_id:
        return None
    return db.get(User, user_id)


def login_user(request, user: User) -> None:
    request.session["user_id"] = user.id


def logout_user(request) -> None:
    csrf_token = request.session.get("csrf_token")
    request.session.clear()
    if csrf_token:
        request.session["csrf_token"] = csrf_token
