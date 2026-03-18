from __future__ import annotations

from fastapi import APIRouter, Depends, Form, Request
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import ValidationError
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from ..constants import APPEARANCE_OPTIONS, COLOR_OPTIONS, GENDER_OPTIONS, HOSTING_MODES, PERSONALITY_OPTIONS, SPECIES_OPTIONS
from ..db import get_db
from ..models import CircleMember, PetEvent
from ..schemas import BreedForm, HostingForm, PetCreateForm
from ..services.auth_service import current_user
from ..services.dashboard_service import build_dashboard_context
from ..services.pet_service import (
    breed_pet,
    clean_pet,
    create_pet,
    eligible_breed_partners,
    feed_pet,
    get_family_data,
    get_user_pet,
    heal_pet,
    play_pet,
    refresh_pet,
    sleep_pet,
)
from ..services.hosting_service import set_hosting_policy
from ..services.shop_service import inventory_map
from ..utils.web import flash, redirect, template_context, verify_csrf


router = APIRouter(prefix="/pets")


def _require_pet_owner(db: Session, request: Request, pet_id: int):
    user = current_user(db, request)
    if not user:
        return None, None
    pet = get_user_pet(db, user, pet_id)
    return user, pet


def _safe_return_to(return_to: str | None, default: str) -> str:
    if return_to and return_to.startswith("/") and not return_to.startswith("//"):
        return return_to
    return default


def _is_htmx_dashboard_request(request: Request, return_to: str | None) -> bool:
    return request.headers.get("HX-Request") == "true" and _safe_return_to(return_to, "") == "/dashboard"


def _render_dashboard_action_response(
    request: Request,
    db: Session,
    user,
    pet_id: int,
    action_notice: str,
    action_notice_level: str,
):
    dashboard_context = build_dashboard_context(db, user, apply_hosting=False)
    pet = next((item for item in dashboard_context["pets"] if item.id == pet_id), None)
    if not pet:
        return JSONResponse({"ok": False, "message": "找不到该宠物"}, status_code=404)
    return request.app.state.templates.TemplateResponse(
        "dashboard/_action_response.html",
        template_context(
            request,
            current_user=user,
            pet=pet,
            latest_coin_event_by_pet=dashboard_context["latest_coin_event_by_pet"],
            coin_events=dashboard_context["coin_events"],
            total_coins=dashboard_context["total_coins"],
            inventory=dashboard_context["inventory"],
            hosting_summary_by_pet=dashboard_context["hosting_summary_by_pet"],
            gender_options=GENDER_OPTIONS,
            appearance_options=APPEARANCE_OPTIONS,
            action_notice=action_notice,
            action_notice_level=action_notice_level,
        ),
    )


@router.get("/new", response_class=HTMLResponse)
def new_pet_page(request: Request, db: Session = Depends(get_db)):
    user = current_user(db, request)
    if not user:
        return redirect("/login")
    return request.app.state.templates.TemplateResponse(
        "pets/new.html",
        template_context(
            request,
            current_user=user,
            species_options=SPECIES_OPTIONS,
            gender_options=GENDER_OPTIONS,
            appearance_options=APPEARANCE_OPTIONS,
            color_options=COLOR_OPTIONS,
            personality_options=PERSONALITY_OPTIONS,
        ),
    )


@router.post("")
def create_pet_submit(
    request: Request,
    name: str = Form(...),
    species: str = Form(...),
    gender: str = Form("male"),
    appearance_style: str = Form("classic"),
    color: str = Form(...),
    personality: str = Form(...),
    csrf_token: str = Form(...),
    db: Session = Depends(get_db),
):
    verify_csrf(request, csrf_token)
    user = current_user(db, request)
    if not user:
        return redirect("/login")

    try:
        form = PetCreateForm(
            name=name,
            species=species,
            gender=gender,
            appearance_style=appearance_style,
            color=color,
            personality=personality,
        )
    except ValidationError as exc:
        flash(request, exc.errors()[0]["msg"], "error")
        return redirect("/pets/new")

    pet = create_pet(
        db,
        user,
        name=form.name,
        species=form.species,
        gender=form.gender,
        appearance_style=form.appearance_style,
        color=form.color,
        personality=form.personality,
    )
    db.commit()
    flash(request, "宠物创建成功", "success")
    return redirect(f"/pets/{pet.id}")


@router.get("/{pet_id}", response_class=HTMLResponse)
def pet_detail(request: Request, pet_id: int, db: Session = Depends(get_db)):
    user, pet = _require_pet_owner(db, request, pet_id)
    if not user:
        return redirect("/login")
    if not pet:
        flash(request, "找不到该宠物", "error")
        return redirect("/dashboard")

    refresh_pet(db, pet, apply_hosting=False)
    events = list(db.scalars(select(PetEvent).where(PetEvent.pet_id == pet.id).order_by(desc(PetEvent.created_at)).limit(12)))
    memberships = list(db.scalars(select(CircleMember).where(CircleMember.pet_id == pet.id)))
    partners = eligible_breed_partners(db, pet)
    inventory = inventory_map(db, user)
    food_count = sum(item.quantity for item in inventory.values() if item.item.category == "food")
    medicine_count = sum(item.quantity for item in inventory.values() if item.item.category == "medicine")
    gift_count = sum(item.quantity for item in inventory.values() if item.item.category == "gift")
    db.commit()
    return request.app.state.templates.TemplateResponse(
        "pets/detail.html",
        template_context(
            request,
            current_user=user,
            pet=pet,
            events=events,
            memberships=memberships,
            partners=partners,
            inventory=inventory,
            food_count=food_count,
            medicine_count=medicine_count,
            gift_count=gift_count,
            gender_options=GENDER_OPTIONS,
            appearance_options=APPEARANCE_OPTIONS,
            hosting_modes=HOSTING_MODES,
        ),
    )


def _manual_action(
    request: Request,
    db: Session,
    pet_id: int,
    action_name: str,
    return_to: str | None = None,
    item_id: int | None = None,
    heal_plan: str | None = None,
):
    user, pet = _require_pet_owner(db, request, pet_id)
    if not user:
        return redirect("/login")
    if not pet:
        flash(request, "找不到该宠物", "error")
        return redirect("/dashboard")
    refresh_pet(db, pet, apply_hosting=False)
    destination = _safe_return_to(return_to, f"/pets/{pet.id}")
    is_htmx_dashboard = _is_htmx_dashboard_request(request, return_to)
    action_notice_level = "success"
    if action_name == "feed":
        try:
            coin_delta = feed_pet(db, pet, user=user, item_id=item_id)
            action_notice = f"已喂食，获得 {coin_delta} 金币，当前剩余 {pet.coins} 金币"
        except ValueError as exc:
            action_notice = str(exc)
            action_notice_level = "error"
    elif action_name == "play":
        coin_delta = play_pet(db, pet)
        action_notice = f"玩耍完成，获得 {coin_delta} 金币，当前剩余 {pet.coins} 金币"
    elif action_name == "clean":
        coin_delta = clean_pet(db, pet)
        action_notice = f"清理完成，获得 {coin_delta} 金币，当前剩余 {pet.coins} 金币"
    elif action_name == "sleep":
        try:
            coin_delta, item_used = sleep_pet(db, pet, user=user, item_id=item_id)
            if item_used:
                action_notice = f"已使用 {item_used}，直接补充精力，当前剩余 {pet.coins} 金币"
            else:
                action_notice = f"睡觉安排完成，获得 {coin_delta} 金币，当前剩余 {pet.coins} 金币"
        except ValueError as exc:
            action_notice = str(exc)
            action_notice_level = "error"
    else:
        try:
            coin_delta = heal_pet(db, pet, user=user, plan=heal_plan or "basic", item_id=item_id)
            spent = abs(coin_delta)
            action_notice = f"恢复完成，花费 {spent} 金币，当前剩余 {pet.coins} 金币" if spent else f"恢复完成，当前剩余 {pet.coins} 金币"
        except ValueError as exc:
            action_notice = str(exc)
            action_notice_level = "error"
    db.commit()
    if is_htmx_dashboard:
        return _render_dashboard_action_response(request, db, user, pet.id, action_notice, action_notice_level)
    flash(request, action_notice, action_notice_level)
    return redirect(destination)


@router.post("/{pet_id}/feed")
def feed_submit(
    request: Request,
    pet_id: int,
    csrf_token: str = Form(...),
    return_to: str = Form(""),
    item_id: int | None = Form(None),
    db: Session = Depends(get_db),
):
    verify_csrf(request, csrf_token)
    return _manual_action(request, db, pet_id, "feed", return_to, item_id=item_id)


@router.post("/{pet_id}/play")
def play_submit(request: Request, pet_id: int, csrf_token: str = Form(...), return_to: str = Form(""), db: Session = Depends(get_db)):
    verify_csrf(request, csrf_token)
    return _manual_action(request, db, pet_id, "play", return_to)


@router.post("/{pet_id}/clean")
def clean_submit(request: Request, pet_id: int, csrf_token: str = Form(...), return_to: str = Form(""), db: Session = Depends(get_db)):
    verify_csrf(request, csrf_token)
    return _manual_action(request, db, pet_id, "clean", return_to)


@router.post("/{pet_id}/sleep")
def sleep_submit(
    request: Request,
    pet_id: int,
    csrf_token: str = Form(...),
    return_to: str = Form(""),
    item_id: int | None = Form(None),
    db: Session = Depends(get_db),
):
    verify_csrf(request, csrf_token)
    return _manual_action(request, db, pet_id, "sleep", return_to, item_id=item_id)


@router.post("/{pet_id}/heal")
def heal_submit(
    request: Request,
    pet_id: int,
    csrf_token: str = Form(...),
    return_to: str = Form(""),
    heal_plan: str = Form("basic"),
    item_id: int | None = Form(None),
    db: Session = Depends(get_db),
):
    verify_csrf(request, csrf_token)
    return _manual_action(request, db, pet_id, "heal", return_to, item_id=item_id, heal_plan=heal_plan)


@router.get("/{pet_id}/hosting", response_class=HTMLResponse)
def hosting_page(request: Request, pet_id: int, db: Session = Depends(get_db)):
    user, pet = _require_pet_owner(db, request, pet_id)
    if not user:
        return redirect("/login")
    if not pet:
        flash(request, "找不到该宠物", "error")
        return redirect("/dashboard")
    refresh_pet(db, pet, apply_hosting=False)
    policy = pet.hosting_policy
    db.commit()
    return request.app.state.templates.TemplateResponse(
        "pets/hosting.html",
        template_context(request, current_user=user, pet=pet, policy=policy, hosting_modes=HOSTING_MODES),
    )


@router.post("/{pet_id}/hosting")
def hosting_submit(
    request: Request,
    pet_id: int,
    hosting_mode: str = Form(...),
    csrf_token: str = Form(...),
    db: Session = Depends(get_db),
):
    verify_csrf(request, csrf_token)
    user, pet = _require_pet_owner(db, request, pet_id)
    if not user:
        return redirect("/login")
    if not pet:
        flash(request, "找不到该宠物", "error")
        return redirect("/dashboard")
    try:
        form = HostingForm(hosting_mode=hosting_mode)
    except ValidationError as exc:
        flash(request, exc.errors()[0]["msg"], "error")
        return redirect(f"/pets/{pet_id}/hosting")
    set_hosting_policy(db, pet, form.hosting_mode)
    db.commit()
    flash(request, "托管设置已保存", "success")
    return redirect(f"/pets/{pet_id}/hosting")


@router.get("/{pet_id}/family", response_class=HTMLResponse)
def family_page(request: Request, pet_id: int, db: Session = Depends(get_db)):
    user, pet = _require_pet_owner(db, request, pet_id)
    if not user:
        return redirect("/login")
    if not pet:
        flash(request, "找不到该宠物", "error")
        return redirect("/dashboard")
    parents, children = get_family_data(db, pet)
    return request.app.state.templates.TemplateResponse(
        "pets/family.html",
        template_context(request, current_user=user, pet=pet, parents=parents, children=children),
    )


@router.post("/{pet_id}/breed")
def breed_submit(
    request: Request,
    pet_id: int,
    partner_pet_id: int = Form(...),
    csrf_token: str = Form(...),
    db: Session = Depends(get_db),
):
    verify_csrf(request, csrf_token)
    user, pet = _require_pet_owner(db, request, pet_id)
    if not user:
        return redirect("/login")
    if not pet:
        flash(request, "找不到该宠物", "error")
        return redirect("/dashboard")
    try:
        form = BreedForm(partner_pet_id=partner_pet_id)
        partner = db.get(type(pet), form.partner_pet_id)
        if not partner:
            raise ValueError("找不到繁殖对象")
        child = breed_pet(db, pet, partner, user)
    except (ValidationError, ValueError) as exc:
        flash(request, str(exc), "error")
        return redirect(f"/pets/{pet_id}")
    db.commit()
    flash(request, f"新的宠物蛋 {child.name} 已诞生", "success")
    return redirect(f"/pets/{child.id}/family")
