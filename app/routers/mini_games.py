from __future__ import annotations

import json

from fastapi import APIRouter, Depends, Form, Request, WebSocket
from fastapi.responses import HTMLResponse, JSONResponse
from sqlalchemy import select
from sqlalchemy.orm import Session
from starlette.websockets import WebSocketDisconnect

from ..db import SessionLocal, get_db
from ..models import Pet
from ..services.auth_service import current_user
from ..services.mini_games import MATCH_DURATION_SECONDS, calculate_voxel_fps_score, claim_mini_game_reward, voxel_room_service
from ..services.pet_service import get_user_pet, refresh_pet
from ..utils.web import flash, redirect, template_context, verify_csrf


router = APIRouter(prefix="/pets/{pet_id}/mini-games")


def _require_pet_owner(db: Session, request: Request, pet_id: int):
    user = current_user(db, request)
    if not user:
        return None, None
    pet = get_user_pet(db, user, pet_id)
    return user, pet


def _room_json_error(message: str, status_code: int = 400) -> JSONResponse:
    return JSONResponse({"ok": False, "message": message}, status_code=status_code)


@router.post("/claim")
def mini_game_claim_submit(
    request: Request,
    pet_id: int,
    game_type: str = Form(...),
    difficulty: str = Form(...),
    weapon: str = Form(""),
    score: int = Form(...),
    csrf_token: str = Form(...),
    db: Session = Depends(get_db),
):
    verify_csrf(request, csrf_token)
    user, pet = _require_pet_owner(db, request, pet_id)
    if not user:
        return JSONResponse({"ok": False, "message": "请先登录"}, status_code=401)
    if not pet:
        return JSONResponse({"ok": False, "message": "找不到该宠物"}, status_code=404)

    refresh_pet(db, pet, apply_hosting=False)
    try:
        reward_result = claim_mini_game_reward(
            db,
            pet,
            game_type=game_type,
            difficulty=difficulty,
            score=score,
            weapon=weapon or None,
        )
    except ValueError as exc:
        db.commit()
        return JSONResponse({"ok": False, "message": str(exc)}, status_code=400)

    db.commit()
    total_coins = sum(db.scalars(select(Pet.coins).where(Pet.user_id == user.id)))
    return JSONResponse(
        {
            "ok": True,
            **reward_result,
            "pet_id": pet.id,
            "pet_name": pet.name,
            "event_type": "mini_game",
            "total_coins": total_coins,
        }
    )


@router.get("/shooting", response_class=HTMLResponse)
def shooting_game_page(request: Request, pet_id: int, db: Session = Depends(get_db)):
    user, pet = _require_pet_owner(db, request, pet_id)
    if not user:
        return redirect("/login")
    if not pet:
        flash(request, "找不到该宠物", "error")
        return redirect("/dashboard")

    refresh_pet(db, pet, apply_hosting=False)
    db.commit()
    return request.app.state.templates.TemplateResponse(
        "pets/shooting.html",
        template_context(
            request,
            current_user=user,
            pet=pet,
            return_to_dashboard=f"/dashboard#pet-card-{pet.id}",
        ),
    )


@router.get("/voxel-fps", response_class=HTMLResponse)
def voxel_fps_game_page(request: Request, pet_id: int, db: Session = Depends(get_db)):
    user, pet = _require_pet_owner(db, request, pet_id)
    if not user:
        return redirect("/login")
    if not pet:
        flash(request, "找不到该宠物", "error")
        return redirect("/dashboard")

    refresh_pet(db, pet, apply_hosting=False)
    db.commit()
    return request.app.state.templates.TemplateResponse(
        "pets/voxel_fps.html",
        template_context(
            request,
            current_user=user,
            pet=pet,
            return_to_dashboard=f"/dashboard#pet-card-{pet.id}",
            match_duration_seconds=MATCH_DURATION_SECONDS,
        ),
    )


@router.get("/voxel-fps/rooms")
def voxel_fps_room_list(request: Request, pet_id: int, db: Session = Depends(get_db)):
    user, pet = _require_pet_owner(db, request, pet_id)
    if not user:
        return _room_json_error("请先登录", 401)
    if not pet:
        return _room_json_error("找不到该宠物", 404)
    return JSONResponse({"ok": True, "rooms": voxel_room_service.list_rooms(), "duration_seconds": MATCH_DURATION_SECONDS})


@router.get("/voxel-fps/rooms/{room_id}")
def voxel_fps_room_detail(request: Request, pet_id: int, room_id: str, player_id: str, db: Session = Depends(get_db)):
    user, pet = _require_pet_owner(db, request, pet_id)
    if not user:
        return _room_json_error("请先登录", 401)
    if not pet:
        return _room_json_error("找不到该宠物", 404)
    try:
        payload = voxel_room_service.get_room_for_player(room_id, player_id, user.id)
    except ValueError as exc:
        return _room_json_error(str(exc), 404)
    return JSONResponse({"ok": True, **payload})


@router.post("/voxel-fps/rooms")
async def voxel_fps_create_room(
    request: Request,
    pet_id: int,
    csrf_token: str = Form(...),
    db: Session = Depends(get_db),
):
    verify_csrf(request, csrf_token)
    user, pet = _require_pet_owner(db, request, pet_id)
    if not user:
        return _room_json_error("请先登录", 401)
    if not pet:
        return _room_json_error("找不到该宠物", 404)
    result = voxel_room_service.create_room(user, pet.id, pet.name)
    await voxel_room_service.broadcast_room_update(result["room"]["room_id"])
    return JSONResponse({"ok": True, **result})


@router.post("/voxel-fps/rooms/{room_id}/join")
async def voxel_fps_join_room(
    request: Request,
    pet_id: int,
    room_id: str,
    csrf_token: str = Form(...),
    db: Session = Depends(get_db),
):
    verify_csrf(request, csrf_token)
    user, pet = _require_pet_owner(db, request, pet_id)
    if not user:
        return _room_json_error("请先登录", 401)
    if not pet:
        return _room_json_error("找不到该宠物", 404)
    try:
        result = voxel_room_service.join_room(room_id, user, pet.id, pet.name)
    except ValueError as exc:
        return _room_json_error(str(exc))
    await voxel_room_service.broadcast_room_update(room_id)
    return JSONResponse({"ok": True, **result})


@router.post("/voxel-fps/rooms/{room_id}/team")
async def voxel_fps_change_team(
    request: Request,
    pet_id: int,
    room_id: str,
    player_id: str = Form(...),
    team: str = Form(...),
    slot_index: int = Form(-1),
    csrf_token: str = Form(...),
    db: Session = Depends(get_db),
):
    verify_csrf(request, csrf_token)
    user, pet = _require_pet_owner(db, request, pet_id)
    if not user:
        return _room_json_error("请先登录", 401)
    if not pet:
        return _room_json_error("找不到该宠物", 404)
    try:
        room = voxel_room_service.change_team(room_id, player_id, user.id, team, None if slot_index < 0 else slot_index)
    except ValueError as exc:
        return _room_json_error(str(exc))
    await voxel_room_service.broadcast_room_update(room_id)
    return JSONResponse({"ok": True, "room": room})


@router.post("/voxel-fps/rooms/{room_id}/slot")
async def voxel_fps_toggle_slot(
    request: Request,
    pet_id: int,
    room_id: str,
    player_id: str = Form(...),
    team: str = Form(...),
    slot_index: int = Form(...),
    closed: str = Form(...),
    csrf_token: str = Form(...),
    db: Session = Depends(get_db),
):
    verify_csrf(request, csrf_token)
    user, pet = _require_pet_owner(db, request, pet_id)
    if not user:
        return _room_json_error("请先登录", 401)
    if not pet:
        return _room_json_error("找不到该宠物", 404)
    try:
        room = voxel_room_service.set_slot_closed(room_id, player_id, user.id, team, slot_index, closed == "true")
    except ValueError as exc:
        return _room_json_error(str(exc))
    await voxel_room_service.broadcast_room_update(room_id)
    return JSONResponse({"ok": True, "room": room})


@router.post("/voxel-fps/rooms/{room_id}/leave")
async def voxel_fps_leave_room(
    request: Request,
    pet_id: int,
    room_id: str,
    player_id: str = Form(...),
    csrf_token: str = Form(...),
    db: Session = Depends(get_db),
):
    verify_csrf(request, csrf_token)
    user, pet = _require_pet_owner(db, request, pet_id)
    if not user:
        return _room_json_error("请先登录", 401)
    if not pet:
        return _room_json_error("找不到该宠物", 404)
    room = voxel_room_service.leave_room(room_id, player_id, user.id)
    if room is not None:
        await voxel_room_service.broadcast_room_update(room_id)
    return JSONResponse({"ok": True, "room": room})


@router.post("/voxel-fps/rooms/{room_id}/start")
async def voxel_fps_start_room(
    request: Request,
    pet_id: int,
    room_id: str,
    player_id: str = Form(...),
    csrf_token: str = Form(...),
    db: Session = Depends(get_db),
):
    verify_csrf(request, csrf_token)
    user, pet = _require_pet_owner(db, request, pet_id)
    if not user:
        return _room_json_error("请先登录", 401)
    if not pet:
        return _room_json_error("找不到该宠物", 404)
    try:
        payload = voxel_room_service.start_room(room_id, player_id, user.id)
    except ValueError as exc:
        return _room_json_error(str(exc))
    await voxel_room_service.broadcast_room_update(room_id)
    await voxel_room_service.broadcast_payload(room_id, {"type": "match_started", "match": payload["match"]})
    return JSONResponse({"ok": True, **payload})


@router.post("/voxel-fps/rooms/{room_id}/claim")
def voxel_fps_claim_multiplayer_reward(
    request: Request,
    pet_id: int,
    room_id: str,
    player_id: str = Form(...),
    csrf_token: str = Form(...),
    db: Session = Depends(get_db),
):
    verify_csrf(request, csrf_token)
    user, pet = _require_pet_owner(db, request, pet_id)
    if not user:
        return _room_json_error("请先登录", 401)
    if not pet:
        return _room_json_error("找不到该宠物", 404)
    try:
        player_result = voxel_room_service.claim_match_reward(room_id, player_id, user.id)
    except ValueError as exc:
        return _room_json_error(str(exc))
    score = calculate_voxel_fps_score(
        int(player_result.get("kills", 0)),
        bool(player_result.get("win_status", False)),
        int(player_result.get("time_alive", 0)),
    )
    reward_result = claim_mini_game_reward(
        db,
        pet,
        game_type="voxel_fps",
        difficulty="normal",
        score=score,
        weapon="voxel_rifle",
    )
    db.commit()
    return JSONResponse({
        "ok": True,
        **reward_result,
        "winner_team": player_result.get("winner_team"),
        "red_kills": player_result.get("red_kills", 0),
        "blue_kills": player_result.get("blue_kills", 0),
        "mvp": player_result.get("mvp", "待定"),
    })


@router.websocket("/voxel-fps/rooms/{room_id}/ws")
async def voxel_fps_room_ws(websocket: WebSocket, pet_id: int, room_id: str):
    db = SessionLocal()
    try:
        user = current_user(db, websocket)
        if not user:
            await websocket.close(code=4401)
            return
        pet = get_user_pet(db, user, pet_id)
        if not pet:
            await websocket.close(code=4404)
            return
        player_id = websocket.query_params.get("player_id", "")
        if not player_id:
            await websocket.close(code=4400)
            return
        try:
            room = await voxel_room_service.connect(room_id, player_id, websocket)
        except ValueError:
            await websocket.close(code=4404)
            return
        await websocket.send_text(json.dumps({"type": "room_state", "room": room}, ensure_ascii=False))
        while True:
            raw = await websocket.receive_text()
            try:
                payload = json.loads(raw)
            except json.JSONDecodeError:
                continue
            await voxel_room_service.handle_message(room_id, player_id, payload)
    except WebSocketDisconnect:
        await voxel_room_service.disconnect(room_id, websocket.query_params.get("player_id", ""))
    finally:
        db.close()
