from __future__ import annotations

from fastapi import APIRouter, Depends, Form, Request
from fastapi.responses import HTMLResponse
from pydantic import ValidationError
from sqlalchemy.orm import Session

from ..constants import INTERACTION_TYPES
from ..db import get_db
from ..schemas import CircleCreateForm, CircleInteractForm, CircleJoinForm
from ..services.auth_service import current_user
from ..services.circle_service import create_circle, get_circle, interact, join_circle, list_circles, recent_circle_events
from ..services.pet_service import refresh_user_pets
from ..services.shop_service import inventory_map
from ..utils.web import flash, redirect, template_context, verify_csrf


router = APIRouter(prefix="/circles")


@router.get("", response_class=HTMLResponse)
def circles_page(request: Request, show: str | None = None, db: Session = Depends(get_db)):
    user = current_user(db, request)
    if not user:
        return redirect("/login")
    pets = refresh_user_pets(db, user, apply_hosting=False)
    circles = list_circles(db)
    db.commit()
    return request.app.state.templates.TemplateResponse(
        "circles/index.html",
        template_context(request, current_user=user, circles=circles, pets=pets, show_create=(show == "create")),
    )


@router.post("")
def create_circle_submit(
    request: Request,
    name: str = Form(...),
    description: str = Form(...),
    csrf_token: str = Form(...),
    db: Session = Depends(get_db),
):
    verify_csrf(request, csrf_token)
    user = current_user(db, request)
    if not user:
        return redirect("/login")
    try:
        form = CircleCreateForm(name=name, description=description)
        circle = create_circle(db, user, form.name, form.description)
    except ValidationError as exc:
        flash(request, exc.errors()[0]["msg"], "error")
        return redirect("/circles?show=create")
    except Exception:
        flash(request, "圈子名称已存在，请换一个名字", "error")
        db.rollback()
        return redirect("/circles?show=create")
    db.commit()
    flash(request, "圈子已创建", "success")
    return redirect(f"/circles/{circle.id}")


@router.get("/{circle_id}", response_class=HTMLResponse)
def circle_detail(request: Request, circle_id: int, db: Session = Depends(get_db)):
    user = current_user(db, request)
    if not user:
        return redirect("/login")
    pets = refresh_user_pets(db, user, apply_hosting=False)
    circle = get_circle(db, circle_id)
    if not circle:
        flash(request, "圈子不存在", "error")
        return redirect("/circles")
    events = recent_circle_events(db, circle)
    user_pet_ids = {pet.id for pet in pets}
    member_pet_ids = {member.pet_id for member in circle.members}
    eligible_join_pets = [pet for pet in pets if pet.id not in member_pet_ids]
    actor_pets = [pet for pet in pets if pet.id in member_pet_ids]
    target_pets = [member.pet for member in circle.members if member.pet_id not in user_pet_ids]
    inventory = inventory_map(db, user)
    gift_count = sum(item.quantity for item in inventory.values() if item.item.category == "gift")
    db.commit()
    return request.app.state.templates.TemplateResponse(
        "circles/detail.html",
        template_context(
            request,
            current_user=user,
            circle=circle,
            events=events,
            eligible_join_pets=eligible_join_pets,
            actor_pets=actor_pets,
            target_pets=target_pets,
            interaction_types=INTERACTION_TYPES,
            gift_count=gift_count,
        ),
    )


@router.post("/{circle_id}/join")
def join_circle_submit(
    request: Request,
    circle_id: int,
    pet_id: int = Form(...),
    csrf_token: str = Form(...),
    db: Session = Depends(get_db),
):
    verify_csrf(request, csrf_token)
    user = current_user(db, request)
    if not user:
        return redirect("/login")
    circle = get_circle(db, circle_id)
    if not circle:
        flash(request, "圈子不存在", "error")
        return redirect("/circles")
    try:
        form = CircleJoinForm(pet_id=pet_id)
        pet = next((pet for pet in user.pets if pet.id == form.pet_id), None)
        if not pet:
            raise ValueError("只能让自己的宠物加入圈子")
        join_circle(db, circle, pet)
    except (ValidationError, ValueError) as exc:
        flash(request, str(exc), "error")
        return redirect(f"/circles/{circle_id}")
    db.commit()
    flash(request, "已加入圈子", "success")
    return redirect(f"/circles/{circle_id}")


@router.post("/{circle_id}/interact")
def interact_submit(
    request: Request,
    circle_id: int,
    actor_pet_id: int = Form(...),
    target_pet_id: int = Form(...),
    action_type: str = Form(...),
    csrf_token: str = Form(...),
    db: Session = Depends(get_db),
):
    verify_csrf(request, csrf_token)
    user = current_user(db, request)
    if not user:
        return redirect("/login")
    circle = get_circle(db, circle_id)
    if not circle:
        flash(request, "圈子不存在", "error")
        return redirect("/circles")
    try:
        form = CircleInteractForm(actor_pet_id=actor_pet_id, target_pet_id=target_pet_id, action_type=action_type)
        actor_pet = next((pet for pet in user.pets if pet.id == form.actor_pet_id), None)
        if not actor_pet:
            raise ValueError("只能使用自己的宠物发起互动")
        target_pet = db.get(type(actor_pet), form.target_pet_id)
        if not target_pet:
            raise ValueError("互动对象不存在")
        message = interact(db, circle, actor_pet, target_pet, form.action_type, user)
    except (ValidationError, ValueError) as exc:
        flash(request, str(exc), "error")
        return redirect(f"/circles/{circle_id}")
    db.commit()
    flash(request, message, "success")
    return redirect(f"/circles/{circle_id}")
