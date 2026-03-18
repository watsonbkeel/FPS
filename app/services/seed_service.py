from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import settings
from ..models import Circle, User
from .auth_service import create_user, get_user_by_email
from .pet_service import create_pet
from .shop_service import seed_items


def seed_demo_data(db: Session) -> None:
    seed_items(db)

    if not settings.seed_demo:
        return

    demo_email = "demo@tamapet.local"
    user = get_user_by_email(db, demo_email)
    if not user:
        user = create_user(db, demo_email, "pass123456")
        create_pet(db, user, name="阿团", species="基础宠物", gender="female", appearance_style="star", color="粉色", personality="活泼")

    existing_circle = db.scalar(select(Circle).where(Circle.name == "新手圈"))
    if not existing_circle:
        db.add(Circle(owner=user, name="新手圈", description="给刚入门的宠物家庭一个轻松的交流空间"))
