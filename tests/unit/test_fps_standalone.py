from __future__ import annotations

import re
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient

from app.fps_main import app
from app.services.mini_games import voxel_room_service


def _extract_hidden_csrf(html: str) -> str:
    match = re.search(r'name="csrf_token" value="([^"]+)"', html)
    assert match is not None
    return match.group(1)


def _extract_data_csrf(html: str) -> str:
    match = re.search(r'data-csrf="([^"]+)"', html)
    assert match is not None
    return match.group(1)


@pytest.fixture(autouse=True)
def clear_voxel_rooms() -> Generator[None, None, None]:
    voxel_room_service._rooms.clear()
    voxel_room_service._connections.clear()
    yield
    voxel_room_service._rooms.clear()
    voxel_room_service._connections.clear()


def test_fps_standalone_nickname_entry_redirects_to_play():
    client = TestClient(app)

    landing = client.get("/")
    assert landing.status_code == 200
    csrf_token = _extract_hidden_csrf(landing.text)

    enter = client.post(
        "/enter",
        data={"nickname": "StormFox", "csrf_token": csrf_token},
        follow_redirects=False,
    )
    assert enter.status_code == 303
    assert enter.headers["location"] == "/play"

    play = client.get("/play")
    assert play.status_code == 200
    assert "StormFox" in play.text
    assert 'data-room-base-url="/api/rooms"' in play.text
    assert 'data-player-label-mode="nickname"' in play.text


def test_fps_standalone_room_flow_uses_nickname_identity():
    host_client = TestClient(app)
    guest_client = TestClient(app)

    host_landing = host_client.get("/")
    host_client.post(
        "/enter",
        data={"nickname": "HostFox", "csrf_token": _extract_hidden_csrf(host_landing.text)},
        follow_redirects=False,
    )
    host_play = host_client.get("/play")
    host_csrf = _extract_data_csrf(host_play.text)

    create_room = host_client.post("/api/rooms", data={"csrf_token": host_csrf})
    assert create_room.status_code == 200
    create_payload = create_room.json()
    assert create_payload["ok"] is True
    room_id = create_payload["room"]["room_id"]
    host_player_id = create_payload["player_id"]
    assert create_payload["room"]["title"] == "HostFox 的房间"

    guest_landing = guest_client.get("/")
    guest_client.post(
        "/enter",
        data={"nickname": "GuestWolf", "csrf_token": _extract_hidden_csrf(guest_landing.text)},
        follow_redirects=False,
    )
    guest_play = guest_client.get("/play")
    guest_csrf = _extract_data_csrf(guest_play.text)

    room_list = guest_client.get("/api/rooms")
    assert room_list.status_code == 200
    room_payload = room_list.json()
    assert room_payload["ok"] is True
    assert any(room["room_id"] == room_id for room in room_payload["rooms"])

    join_room = guest_client.post(f"/api/rooms/{room_id}/join", data={"csrf_token": guest_csrf})
    assert join_room.status_code == 200
    join_payload = join_room.json()
    assert join_payload["ok"] is True
    assert join_payload["room"]["current_player_id"] == join_payload["player_id"]

    detail = host_client.get(f"/api/rooms/{room_id}?player_id={host_player_id}")
    assert detail.status_code == 200
    detail_payload = detail.json()
    assert detail_payload["ok"] is True
    all_labels = []
    for team in ("red", "blue"):
        for seat in detail_payload["room"]["teams"][team]:
            if seat["seat_state"] == "occupied":
                all_labels.append(seat["label"])
    assert "HostFox" in all_labels
    assert "GuestWolf" in all_labels


def test_fps_standalone_claim_returns_local_result_only():
    client = TestClient(app)

    landing = client.get("/")
    client.post(
        "/enter",
        data={"nickname": "SoloBird", "csrf_token": _extract_hidden_csrf(landing.text)},
        follow_redirects=False,
    )
    play = client.get("/play")
    claim = client.post(
        "/api/claim",
        data={
            "game_type": "voxel_fps",
            "difficulty": "normal",
            "weapon": "voxel_rifle",
            "score": "88",
            "csrf_token": _extract_data_csrf(play.text),
        },
    )

    assert claim.status_code == 200
    payload = claim.json()
    assert payload["ok"] is True
    assert payload["reward"] == 0
    assert payload["score"] == 88
