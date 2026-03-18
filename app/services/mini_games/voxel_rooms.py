from __future__ import annotations

import json
import threading
import time
import uuid
from dataclasses import dataclass, field
from typing import Any, Literal

from fastapi import WebSocket
from starlette.websockets import WebSocketState

from ...models import User

TEAM_RED = "red"
TEAM_BLUE = "blue"
TEAM_ORDER = (TEAM_RED, TEAM_BLUE)
TEAM_SIZE = 5
ROOM_TTL_SECONDS = 60 * 60 * 2
ROOM_DISCONNECT_GRACE_SECONDS = 60
FINISHED_ROOM_TTL_SECONDS = 60 * 15
MATCH_DURATION_SECONDS = 300

RoomStatus = Literal["lobby", "started", "finished"]


@dataclass
class RoomMember:
    player_id: str
    user_id: int
    label: str
    pet_id: int
    pet_name: str
    team: str
    slot_index: int
    is_host: bool = False
    connected: bool = False
    joined_at: float = field(default_factory=time.time)
    disconnected_at: float | None = None

    @property
    def is_captain(self) -> bool:
        return self.slot_index == 0

    def to_payload(self) -> dict[str, Any]:
        return {
            "player_id": self.player_id,
            "user_id": self.user_id,
            "label": self.label,
            "pet_id": self.pet_id,
            "pet_name": self.pet_name,
            "team": self.team,
            "slot_index": self.slot_index,
            "is_host": self.is_host,
            "is_connected": self.connected,
            "is_captain": self.is_captain,
        }


@dataclass
class Room:
    room_id: str
    title: str
    host_player_id: str
    host_user_id: int
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)
    status: RoomStatus = "lobby"
    match_seed: int = field(default_factory=lambda: int(time.time() * 1000) % 1_000_000_000)
    members: dict[str, RoomMember] = field(default_factory=dict)
    closed_slots: dict[str, set[int]] = field(default_factory=lambda: {TEAM_RED: set(), TEAM_BLUE: set()})
    match_config: dict[str, Any] | None = None
    latest_snapshot: dict[str, Any] | None = None
    final_result: dict[str, Any] | None = None
    claimed_player_ids: set[str] = field(default_factory=set)

    def touch(self) -> None:
        self.updated_at = time.time()

    def human_count(self) -> int:
        return len(self.members)

    def team_members(self, team: str) -> list[RoomMember]:
        return sorted((member for member in self.members.values() if member.team == team), key=lambda item: item.slot_index)

    def slot_owner(self, team: str, slot_index: int) -> RoomMember | None:
        return next((member for member in self.members.values() if member.team == team and member.slot_index == slot_index), None)

    def lobby_payload(self, current_player_id: str | None = None) -> dict[str, Any]:
        teams: dict[str, list[dict[str, Any]]] = {TEAM_RED: [], TEAM_BLUE: []}
        for team in TEAM_ORDER:
            for slot_index in range(TEAM_SIZE):
                member = self.slot_owner(team, slot_index)
                if member:
                    teams[team].append({"seat_state": "occupied", **member.to_payload()})
                elif slot_index in self.closed_slots.get(team, set()):
                    teams[team].append({"seat_state": "closed", "team": team, "slot_index": slot_index})
                else:
                    teams[team].append({"seat_state": "open", "team": team, "slot_index": slot_index})
        current_member = self.members.get(current_player_id) if current_player_id else None
        return {
            "room_id": self.room_id,
            "title": self.title,
            "status": self.status,
            "created_at": self.created_at,
            "host_player_id": self.host_player_id,
            "host_user_id": self.host_user_id,
            "match_seed": self.match_seed,
            "duration_seconds": MATCH_DURATION_SECONDS,
            "human_count": self.human_count(),
            "teams": teams,
            "current_player_id": current_player_id,
            "current_team": current_member.team if current_member else None,
            "current_slot_index": current_member.slot_index if current_member else None,
            "is_host": bool(current_member and current_member.is_host),
            "has_snapshot": self.latest_snapshot is not None,
            "has_final_result": self.final_result is not None,
        }

    def summary_payload(self) -> dict[str, Any]:
        return {
            "room_id": self.room_id,
            "title": self.title,
            "status": self.status,
            "created_at": self.created_at,
            "human_count": self.human_count(),
            "red_count": len(self.team_members(TEAM_RED)),
            "blue_count": len(self.team_members(TEAM_BLUE)),
            "host_label": self.members[self.host_player_id].label if self.host_player_id in self.members else "房主",
            "open_slots": sum(1 for team in TEAM_ORDER for idx in range(TEAM_SIZE) if self.slot_owner(team, idx) is None and idx not in self.closed_slots.get(team, set())),
        }


class VoxelRoomService:
    def __init__(self) -> None:
        self._rooms: dict[str, Room] = {}
        self._connections: dict[str, dict[str, WebSocket]] = {}
        self._lock = threading.RLock()

    def _display_label(self, user: User) -> str:
        local = user.email.split("@", 1)[0].strip() if user.email else "player"
        return local[:18] or f"player-{user.id}"

    def _room_title(self, label: str, pet_name: str) -> str:
        return f"{label} / {pet_name} 的房间"

    def _room_match_payload(self, room: Room) -> dict[str, Any]:
        if room.match_config:
            return room.match_config
        humans = [item.to_payload() for item in sorted(room.members.values(), key=lambda entry: (entry.team, entry.slot_index))]
        return {
            "room_id": room.room_id,
            "duration_seconds": MATCH_DURATION_SECONDS,
            "seed": room.match_seed,
            "humans": humans,
            "bot_fill": {
                TEAM_RED: TEAM_SIZE - len(room.team_members(TEAM_RED)),
                TEAM_BLUE: TEAM_SIZE - len(room.team_members(TEAM_BLUE)),
            },
        }

    def _cleanup_locked(self) -> None:
        now = time.time()
        stale_ids: list[str] = []
        for room_id, room in self._rooms.items():
            if room.status == "lobby":
                disconnected = [
                    player_id
                    for player_id, member in room.members.items()
                    if not member.connected and member.disconnected_at and now - member.disconnected_at > ROOM_DISCONNECT_GRACE_SECONDS
                ]
                for player_id in disconnected:
                    room.members.pop(player_id, None)
                if not room.members:
                    stale_ids.append(room_id)
                    continue
                self._ensure_host_locked(room)
            elif room.status == "finished":
                if room.final_result and (room.claimed_player_ids.issuperset(room.members.keys()) or now - room.updated_at > FINISHED_ROOM_TTL_SECONDS):
                    stale_ids.append(room_id)
                    continue
            if now - room.updated_at > ROOM_TTL_SECONDS:
                stale_ids.append(room_id)
        for room_id in stale_ids:
            self._rooms.pop(room_id, None)
            self._connections.pop(room_id, None)

    def list_rooms(self) -> list[dict[str, Any]]:
        with self._lock:
            self._cleanup_locked()
            rooms = [room.summary_payload() for room in self._rooms.values() if room.status == "lobby"]
        return sorted(rooms, key=lambda item: item["created_at"], reverse=True)

    def get_room(self, room_id: str) -> Room | None:
        with self._lock:
            self._cleanup_locked()
            return self._rooms.get(room_id)

    def get_room_for_player(self, room_id: str, player_id: str, user_id: int) -> dict[str, Any]:
        with self._lock:
            self._cleanup_locked()
            room = self._rooms.get(room_id)
            if not room:
                raise ValueError("房间不存在")
            member = room.members.get(player_id)
            if not member or member.user_id != user_id:
                raise ValueError("玩家不存在")
            room.touch()
            payload = {"room": room.lobby_payload(player_id)}
            if room.status != "lobby":
                payload["match"] = self._room_match_payload(room)
            if room.latest_snapshot is not None:
                payload["snapshot"] = room.latest_snapshot
            if room.final_result is not None:
                payload["final_result"] = room.final_result
            return payload

    def _first_open_slot(self, room: Room, preferred_team: str | None = None) -> tuple[str, int] | None:
        teams = [preferred_team] if preferred_team else [TEAM_BLUE, TEAM_RED]
        if preferred_team is None and room.slot_owner(TEAM_BLUE, 0) is None and 0 not in room.closed_slots.get(TEAM_BLUE, set()):
            return TEAM_BLUE, 0
        for team in teams:
            for slot_index in range(TEAM_SIZE):
                if slot_index in room.closed_slots.get(team, set()):
                    continue
                if room.slot_owner(team, slot_index) is None:
                    return team, slot_index
        return None

    def _ensure_host_locked(self, room: Room) -> None:
        if room.host_player_id in room.members and room.members[room.host_player_id].is_host:
            return
        for member in room.members.values():
            member.is_host = False
        next_host = min(room.members.values(), key=lambda item: (not item.connected, item.joined_at))
        next_host.is_host = True
        room.host_player_id = next_host.player_id
        room.host_user_id = next_host.user_id

    def create_room(self, user: User, pet_id: int, pet_name: str) -> dict[str, Any]:
        label = self._display_label(user)
        with self._lock:
            self._cleanup_locked()
            room_id = uuid.uuid4().hex[:8]
            player_id = uuid.uuid4().hex
            room = Room(
                room_id=room_id,
                title=self._room_title(label, pet_name),
                host_player_id=player_id,
                host_user_id=user.id,
            )
            room.members[player_id] = RoomMember(
                player_id=player_id,
                user_id=user.id,
                label=label,
                pet_id=pet_id,
                pet_name=pet_name,
                team=TEAM_RED,
                slot_index=0,
                is_host=True,
            )
            self._rooms[room_id] = room
            room.touch()
            payload = room.lobby_payload(player_id)
        return {"player_id": player_id, "room": payload}

    def join_room(self, room_id: str, user: User, pet_id: int, pet_name: str) -> dict[str, Any]:
        label = self._display_label(user)
        with self._lock:
            room = self._rooms.get(room_id)
            if not room:
                raise ValueError("房间不存在")
            existing = next((member for member in room.members.values() if member.user_id == user.id), None)
            if existing:
                existing.connected = False
                existing.disconnected_at = None
                room.touch()
                result: dict[str, Any] = {"player_id": existing.player_id, "room": room.lobby_payload(existing.player_id)}
                if room.status != "lobby":
                    result["match"] = self._room_match_payload(room)
                if room.latest_snapshot is not None:
                    result["snapshot"] = room.latest_snapshot
                if room.final_result is not None:
                    result["final_result"] = room.final_result
                return result
            if room.status != "lobby":
                raise ValueError("房间已经开始")
            slot = self._first_open_slot(room)
            if slot is None:
                raise ValueError("房间已满")
            team, slot_index = slot
            player_id = uuid.uuid4().hex
            room.members[player_id] = RoomMember(
                player_id=player_id,
                user_id=user.id,
                label=label,
                pet_id=pet_id,
                pet_name=pet_name,
                team=team,
                slot_index=slot_index,
            )
            room.touch()
            payload = room.lobby_payload(player_id)
        return {"player_id": player_id, "room": payload}

    def change_team(self, room_id: str, player_id: str, user_id: int, team: str, slot_index: int | None = None) -> dict[str, Any]:
        if team not in TEAM_ORDER:
            raise ValueError("队伍不存在")
        with self._lock:
            room = self._rooms.get(room_id)
            if not room:
                raise ValueError("房间不存在")
            if room.status != "lobby":
                raise ValueError("对局已经开始")
            member = room.members.get(player_id)
            if not member or member.user_id != user_id:
                raise ValueError("玩家不存在")
            if member.is_host:
                raise ValueError("房主固定在红队队长位")
            target_slot = slot_index
            if target_slot is None:
                open_slot = self._first_open_slot(room, team)
                if not open_slot:
                    raise ValueError("目标队伍已满")
                _, target_slot = open_slot
            if target_slot < 0 or target_slot >= TEAM_SIZE:
                raise ValueError("队伍位置不存在")
            if target_slot in room.closed_slots.get(team, set()):
                raise ValueError("该位置已关闭")
            occupied = room.slot_owner(team, target_slot)
            if occupied and occupied.player_id != player_id:
                raise ValueError("该位置已经有人")
            member.team = team
            member.slot_index = target_slot
            room.touch()
            return room.lobby_payload(player_id)

    def set_slot_closed(self, room_id: str, player_id: str, user_id: int, team: str, slot_index: int, closed: bool) -> dict[str, Any]:
        if team not in TEAM_ORDER:
            raise ValueError("队伍不存在")
        if slot_index < 0 or slot_index >= TEAM_SIZE:
            raise ValueError("队伍位置不存在")
        with self._lock:
            room = self._rooms.get(room_id)
            if not room:
                raise ValueError("房间不存在")
            if room.status != "lobby":
                raise ValueError("对局已经开始")
            member = room.members.get(player_id)
            if not member or member.user_id != user_id or not member.is_host:
                raise ValueError("只有房主才能调整空位")
            occupant = room.slot_owner(team, slot_index)
            if occupant is not None:
                raise ValueError("当前位置已有玩家")
            if team == TEAM_RED and slot_index == 0:
                raise ValueError("红队队长位不能关闭")
            if closed:
                room.closed_slots.setdefault(team, set()).add(slot_index)
            else:
                room.closed_slots.setdefault(team, set()).discard(slot_index)
            room.touch()
            return room.lobby_payload(player_id)

    def leave_room(self, room_id: str, player_id: str, user_id: int) -> dict[str, Any] | None:
        with self._lock:
            room = self._rooms.get(room_id)
            if not room:
                return None
            member = room.members.get(player_id)
            if not member or member.user_id != user_id:
                return room.lobby_payload(None)
            room.members.pop(player_id, None)
            self._connections.get(room_id, {}).pop(player_id, None)
            if not room.members:
                self._rooms.pop(room_id, None)
                self._connections.pop(room_id, None)
                return None
            self._ensure_host_locked(room)
            room.touch()
            return room.lobby_payload(None)

    def start_room(self, room_id: str, player_id: str, user_id: int) -> dict[str, Any]:
        with self._lock:
            room = self._rooms.get(room_id)
            if not room:
                raise ValueError("房间不存在")
            if room.status != "lobby":
                raise ValueError("房间已经开始")
            member = room.members.get(player_id)
            if not member or member.user_id != user_id or not member.is_host:
                raise ValueError("只有房主才能开始")
            room.status = "started"
            room.match_seed = int(time.time() * 1000) % 1_000_000_000
            humans = [item.to_payload() for item in sorted(room.members.values(), key=lambda entry: (entry.team, entry.slot_index))]
            room.match_config = {
                "room_id": room.room_id,
                "duration_seconds": MATCH_DURATION_SECONDS,
                "seed": room.match_seed,
                "humans": humans,
                "closed_slots": {team: sorted(room.closed_slots.get(team, set())) for team in TEAM_ORDER},
                "bot_fill": {
                    TEAM_RED: sum(1 for idx in range(TEAM_SIZE) if room.slot_owner(TEAM_RED, idx) is None and idx not in room.closed_slots.get(TEAM_RED, set())),
                    TEAM_BLUE: sum(1 for idx in range(TEAM_SIZE) if room.slot_owner(TEAM_BLUE, idx) is None and idx not in room.closed_slots.get(TEAM_BLUE, set())),
                },
            }
            room.final_result = None
            room.claimed_player_ids.clear()
            room.latest_snapshot = None
            room.touch()
            return {"room": room.lobby_payload(player_id), "match": room.match_config}

    def finalize_match(self, room_id: str, payload: dict[str, Any]) -> None:
        with self._lock:
            room = self._rooms.get(room_id)
            if not room:
                return
            room.status = "finished"
            room.final_result = payload
            room.touch()

    def claim_match_reward(self, room_id: str, player_id: str, user_id: int) -> dict[str, Any]:
        with self._lock:
            room = self._rooms.get(room_id)
            if not room or not room.final_result:
                raise ValueError("联机对局结算尚未完成")
            member = room.members.get(player_id)
            if not member or member.user_id != user_id:
                raise ValueError("玩家不存在")
            if player_id in room.claimed_player_ids:
                raise ValueError("该联机奖励已经领取")
            player_results = room.final_result.get("player_results", [])
            player_result = next((item for item in player_results if item.get("player_id") == player_id), None)
            if not player_result:
                raise ValueError("找不到该玩家的联机战绩")
            room.claimed_player_ids.add(player_id)
            room.touch()
            return player_result

    async def connect(self, room_id: str, player_id: str, websocket: WebSocket) -> dict[str, Any]:
        await websocket.accept()
        with self._lock:
            room = self._rooms.get(room_id)
            if not room:
                raise ValueError("房间不存在")
            member = room.members.get(player_id)
            if not member:
                raise ValueError("玩家不存在")
            self._connections.setdefault(room_id, {})[player_id] = websocket
            member.connected = True
            member.disconnected_at = None
            room.touch()
            payload = room.lobby_payload(player_id)
        await self.broadcast_room_update(room_id)
        return payload

    async def disconnect(self, room_id: str, player_id: str) -> None:
        host_transferred_to: str | None = None
        with self._lock:
            connections = self._connections.get(room_id, {})
            connections.pop(player_id, None)
            room = self._rooms.get(room_id)
            if not room:
                return
            member = room.members.get(player_id)
            if not member:
                return
            member.connected = False
            member.disconnected_at = time.time()
            previous_host = room.host_player_id if member.is_host else None
            if member.is_host and room.members:
                member.is_host = False
                room.host_player_id = ""
                self._ensure_host_locked(room)
                if room.host_player_id and room.host_player_id != previous_host:
                    host_transferred_to = room.host_player_id
            room.touch()
        await self.broadcast_room_update(room_id)
        await self.broadcast_payload(room_id, {"type": "player_disconnected", "player_id": player_id})
        if host_transferred_to:
            await self.broadcast_payload(room_id, {"type": "host_transferred", "player_id": host_transferred_to})

    async def broadcast_room_update(self, room_id: str) -> None:
        with self._lock:
            room = self._rooms.get(room_id)
            if not room:
                return
            connections = list(self._connections.get(room_id, {}).items())
            payloads = {
                player_id: {"type": "room_state", "room": room.lobby_payload(player_id)}
                for player_id, _ in connections
            }
            match_payload = self._room_match_payload(room) if room.status != "lobby" else None
            snapshot_payload = room.latest_snapshot
            final_payload = room.final_result
        for player_id, websocket in connections:
            await self._safe_send(websocket, payloads[player_id])
            if match_payload is not None:
                await self._safe_send(websocket, {"type": "match_started", "match": match_payload})
            if snapshot_payload is not None:
                await self._safe_send(websocket, {"type": "host_snapshot", "payload": snapshot_payload})
            if final_payload is not None:
                await self._safe_send(websocket, {"type": "match_end", "payload": final_payload})

    async def handle_message(self, room_id: str, player_id: str, payload: dict[str, Any]) -> None:
        message_type = payload.get("type")
        if message_type == "ping":
            await self.broadcast_payload(room_id, {"type": "pong", "ts": time.time()}, targets=[player_id])
            return

        with self._lock:
            room = self._rooms.get(room_id)
            member = room.members.get(player_id) if room else None
            if not room or not member:
                return
            is_host = member.is_host
            is_captain = member.is_captain
            room.touch()
            if message_type == "host_snapshot" and is_host:
                room.latest_snapshot = payload.get("payload", {})
            if message_type == "match_end" and is_host:
                room.status = "finished"
                room.final_result = payload.get("payload", {})
                room.latest_snapshot = payload.get("payload", {}).get("snapshot") or room.latest_snapshot

        if message_type in {"player_state", "player_fire", "player_hit", "player_respawn", "host_snapshot", "match_end", "captain_command", "player_wave"}:
            if message_type in {"host_snapshot", "match_end"} and not is_host:
                return
            if message_type == "captain_command" and not is_captain:
                return
            forward = {"type": message_type, "player_id": player_id, "payload": payload.get("payload", {})}
            if message_type == "host_snapshot":
                await self.broadcast_payload(room_id, forward, exclude=[player_id])
            else:
                await self.broadcast_payload(room_id, forward, exclude=[])
            return

        if message_type == "request_room_state":
            await self.broadcast_room_update(room_id)

    async def broadcast_payload(
        self,
        room_id: str,
        payload: dict[str, Any],
        *,
        exclude: list[str] | None = None,
        targets: list[str] | None = None,
    ) -> None:
        exclude_set = set(exclude or [])
        with self._lock:
            connections = list(self._connections.get(room_id, {}).items())
        for player_id, websocket in connections:
            if targets is not None and player_id not in targets:
                continue
            if player_id in exclude_set:
                continue
            await self._safe_send(websocket, payload)

    async def _safe_send(self, websocket: WebSocket, payload: dict[str, Any]) -> None:
        if websocket.client_state != WebSocketState.CONNECTED:
            return
        try:
            await websocket.send_text(json.dumps(payload, ensure_ascii=False))
        except Exception:
            return


voxel_room_service = VoxelRoomService()
