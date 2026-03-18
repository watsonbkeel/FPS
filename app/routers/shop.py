from __future__ import annotations

from fastapi import APIRouter, Depends, Form, Request
from fastapi.responses import HTMLResponse
from pydantic import ValidationError
from sqlalchemy.orm import Session

from ..db import get_db
from ..schemas import ShopPurchaseForm
from ..services.auth_service import current_user
from ..services.pet_service import refresh_user_pets
from ..services.shop_service import buy_item, hourly_shop_offers, inventory_map, shop_refresh_window
from ..utils.web import flash, redirect, template_context, verify_csrf


router = APIRouter(prefix="/shop")


@router.get("", response_class=HTMLResponse)
def shop_page(request: Request, db: Session = Depends(get_db)):
    user = current_user(db, request)
    if not user:
        return redirect("/login")
    pets = refresh_user_pets(db, user, apply_hosting=False)
    items = hourly_shop_offers(db)
    refresh_start, refresh_end = shop_refresh_window()
    inventory = inventory_map(db, user)
    db.commit()
    return request.app.state.templates.TemplateResponse(
        "shop/index.html",
        template_context(
            request,
            current_user=user,
            pets=pets,
            items=items,
            inventory=inventory,
            refresh_start=refresh_start,
            refresh_end=refresh_end,
        ),
    )


@router.post("/buy")
def buy_submit(
    request: Request,
    item_id: int = Form(...),
    pet_id: int = Form(...),
    csrf_token: str = Form(...),
    db: Session = Depends(get_db),
):
    verify_csrf(request, csrf_token)
    user = current_user(db, request)
    if not user:
        return redirect("/login")
    try:
        form = ShopPurchaseForm(item_id=item_id, pet_id=pet_id)
        pet = next((pet for pet in user.pets if pet.id == form.pet_id), None)
        if not pet:
            raise ValueError("请选择自己的宠物进行购买")
        item = buy_item(db, user, pet, form.item_id)
    except (ValidationError, ValueError) as exc:
        flash(request, str(exc), "error")
        return redirect("/shop")
    db.commit()
    flash(request, f"已购买 {item.name}，花费 {item.price} 金币，当前剩余 {pet.coins} 金币", "success")
    return redirect("/shop")
