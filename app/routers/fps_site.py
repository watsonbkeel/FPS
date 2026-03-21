from __future__ import annotations

from fastapi import APIRouter, Form, Request, WebSocket
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import ValidationError
from starlette.websockets import WebSocketDisconnect

from ..schemas import FpsNicknameForm
from ..services.fps_identity_service import current_fps_identity, login_fps_identity, logout_fps_identity
from ..services.mini_games import MATCH_DURATION_SECONDS, calculate_voxel_fps_score, voxel_room_service
from ..utils.web import flash, redirect, template_context, verify_csrf


router = APIRouter()


def _current_identity(request) -> tuple[int, str] | tuple[None, None]:
    identity = current_fps_identity(request)
    if not identity:
        return None, None
    return identity.user_id, identity.nickname


def _room_json_error(message: str, status_code: int = 400) -> JSONResponse:
    return JSONResponse({"ok": False, "message": message}, status_code=status_code)


@router.get("/health")
def health_check() -> JSONResponse:
    return JSONResponse({"status": "ok", "service": "tamapet-fps"})


@router.get("/", response_class=HTMLResponse)
def fps_homepage(request: Request):
    identity = current_fps_identity(request)
    if identity and request.query_params.get("change") != "1":
        return redirect("/play")
    return request.app.state.templates.TemplateResponse(
        "fps/landing.html",
        template_context(request, fps_identity=identity),
    )


@router.post("/enter")
def fps_enter_submit(
    request: Request,
    nickname: str = Form(...),
    csrf_token: str = Form(...),
):
    verify_csrf(request, csrf_token)
    try:
        form = FpsNicknameForm(nickname=nickname)
    except ValidationError as exc:
        flash(request, exc.errors()[0]["msg"], "error")
        return redirect("/")
    login_fps_identity(request, form.nickname)
    flash(request, f"欢迎，{form.nickname}。直接进入方块战场。", "success")
    return redirect("/play")


@router.post("/logout")
def fps_logout_submit(request: Request, csrf_token: str = Form(...)):
    verify_csrf(request, csrf_token)
    logout_fps_identity(request)
    flash(request, "已退出当前昵称。", "success")
    return redirect("/")


@router.get("/play", response_class=HTMLResponse)
def fps_game_page(request: Request):
    identity = current_fps_identity(request)
    if not identity:
        flash(request, "请先输入昵称后再进入战场。", "warning")
        return redirect("/")
    return request.app.state.templates.TemplateResponse(
        "fps/game.html",
        template_context(
            request,
            fps_identity=identity,
            match_duration_seconds=MATCH_DURATION_SECONDS,
        ),
    )


@router.post("/api/claim")
def fps_claim_submit(
    request: Request,
    game_type: str = Form(...),
    difficulty: str = Form(...),
    weapon: str = Form(""),
    score: int = Form(...),
    csrf_token: str = Form(...),
):
    verify_csrf(request, csrf_token)
    user_id, nickname = _current_identity(request)
    if user_id is None or nickname is None:
        return _room_json_error("请先输入昵称", 401)
    normalized_score = max(0, min(100, int(score)))
    return JSONResponse(
        {
            "ok": True,
            "game_type": game_type,
            "game_label": "方块战场",
            "difficulty_label": difficulty,
            "weapon_label": weapon or None,
            "score": normalized_score,
            "reward": 0,
            "coins_after": 0,
            "message": f"{nickname} 完成了一局独立版方块战场，本地得分 {normalized_score}。",
        }
    )


@router.get("/api/rooms")
def fps_room_list(request: Request):
    user_id, nickname = _current_identity(request)
    if user_id is None or nickname is None:
        return _room_json_error("请先输入昵称", 401)
    return JSONResponse({"ok": True, "rooms": voxel_room_service.list_rooms(), "duration_seconds": MATCH_DURATION_SECONDS})


@router.get("/api/rooms/{room_id}")
def fps_room_detail(request: Request, room_id: str, player_id: str):
    user_id, nickname = _current_identity(request)
    if user_id is None or nickname is None:
        return _room_json_error("请先输入昵称", 401)
    try:
        payload = voxel_room_service.get_room_for_player(room_id, player_id, user_id)
    except ValueError as exc:
        return _room_json_error(str(exc), 404)
    return JSONResponse({"ok": True, **payload})


@router.post("/api/rooms")
async def fps_create_room(request: Request, csrf_token: str = Form(...)):
    verify_csrf(request, csrf_token)
    user_id, nickname = _current_identity(request)
    if user_id is None or nickname is None:
        return _room_json_error("请先输入昵称", 401)
    result = voxel_room_service.create_room_for_identity(user_id=user_id, label=nickname)
    await voxel_room_service.broadcast_room_update(result["room"]["room_id"])
    return JSONResponse({"ok": True, **result})


@router.post("/api/rooms/{room_id}/join")
async def fps_join_room(request: Request, room_id: str, csrf_token: str = Form(...)):
    verify_csrf(request, csrf_token)
    user_id, nickname = _current_identity(request)
    if user_id is None or nickname is None:
        return _room_json_error("请先输入昵称", 401)
    try:
        result = voxel_room_service.join_room_for_identity(room_id, user_id=user_id, label=nickname)
    except ValueError as exc:
        return _room_json_error(str(exc))
    await voxel_room_service.broadcast_room_update(room_id)
    return JSONResponse({"ok": True, **result})


@router.post("/api/rooms/{room_id}/team")
async def fps_change_team(
    request: Request,
    room_id: str,
    player_id: str = Form(...),
    team: str = Form(...),
    slot_index: int = Form(-1),
    csrf_token: str = Form(...),
):
    verify_csrf(request, csrf_token)
    user_id, nickname = _current_identity(request)
    if user_id is None or nickname is None:
        return _room_json_error("请先输入昵称", 401)
    try:
        room = voxel_room_service.change_team(room_id, player_id, user_id, team, None if slot_index < 0 else slot_index)
    except ValueError as exc:
        return _room_json_error(str(exc))
    await voxel_room_service.broadcast_room_update(room_id)
    return JSONResponse({"ok": True, "room": room})


@router.post("/api/rooms/{room_id}/slot")
async def fps_toggle_slot(
    request: Request,
    room_id: str,
    player_id: str = Form(...),
    team: str = Form(...),
    slot_index: int = Form(...),
    closed: str = Form(...),
    csrf_token: str = Form(...),
):
    verify_csrf(request, csrf_token)
    user_id, nickname = _current_identity(request)
    if user_id is None or nickname is None:
        return _room_json_error("请先输入昵称", 401)
    try:
        room = voxel_room_service.set_slot_closed(room_id, player_id, user_id, team, slot_index, closed == "true")
    except ValueError as exc:
        return _room_json_error(str(exc))
    await voxel_room_service.broadcast_room_update(room_id)
    return JSONResponse({"ok": True, "room": room})


@router.post("/api/rooms/{room_id}/leave")
async def fps_leave_room(
    request: Request,
    room_id: str,
    player_id: str = Form(...),
    csrf_token: str = Form(...),
):
    verify_csrf(request, csrf_token)
    user_id, nickname = _current_identity(request)
    if user_id is None or nickname is None:
        return _room_json_error("请先输入昵称", 401)
    room = voxel_room_service.leave_room(room_id, player_id, user_id)
    if room is not None:
        await voxel_room_service.broadcast_room_update(room_id)
    return JSONResponse({"ok": True, "room": room})


@router.post("/api/rooms/{room_id}/start")
async def fps_start_room(
    request: Request,
    room_id: str,
    player_id: str = Form(...),
    csrf_token: str = Form(...),
):
    verify_csrf(request, csrf_token)
    user_id, nickname = _current_identity(request)
    if user_id is None or nickname is None:
        return _room_json_error("请先输入昵称", 401)
    try:
        payload = voxel_room_service.start_room(room_id, player_id, user_id)
    except ValueError as exc:
        return _room_json_error(str(exc))
    await voxel_room_service.broadcast_room_update(room_id)
    await voxel_room_service.broadcast_payload(room_id, {"type": "match_started", "match": payload["match"]})
    return JSONResponse({"ok": True, **payload})


@router.post("/api/rooms/{room_id}/claim")
def fps_claim_multiplayer_reward(
    request: Request,
    room_id: str,
    player_id: str = Form(...),
    csrf_token: str = Form(...),
):
    verify_csrf(request, csrf_token)
    user_id, nickname = _current_identity(request)
    if user_id is None or nickname is None:
        return _room_json_error("请先输入昵称", 401)
    try:
        player_result = voxel_room_service.claim_match_reward(room_id, player_id, user_id)
    except ValueError as exc:
        return _room_json_error(str(exc))
    score = calculate_voxel_fps_score(
        int(player_result.get("kills", 0)),
        bool(player_result.get("win_status", False)),
        int(player_result.get("time_alive", 0)),
    )
    return JSONResponse(
        {
            "ok": True,
            "game_label": "方块战场",
            "score": score,
            "reward": 0,
            "coins_after": 0,
            "winner_team": player_result.get("winner_team"),
            "red_kills": player_result.get("red_kills", 0),
            "blue_kills": player_result.get("blue_kills", 0),
            "mvp": player_result.get("mvp", "待定"),
        }
    )


@router.websocket("/api/rooms/{room_id}/ws")
async def fps_room_ws(websocket: WebSocket, room_id: str):
    identity = current_fps_identity(websocket)
    if not identity:
        await websocket.close(code=4401)
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
    await websocket.send_json({"type": "room_state", "room": room})
    try:
        while True:
            payload = await websocket.receive_json()
            if isinstance(payload, dict):
                await voxel_room_service.handle_message(room_id, player_id, payload)
    except WebSocketDisconnect:
        await voxel_room_service.disconnect(room_id, player_id)
