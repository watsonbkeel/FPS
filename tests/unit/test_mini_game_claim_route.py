from __future__ import annotations

import json
from datetime import datetime, timedelta
from pathlib import Path
import sys

ROOT_DIR = Path(__file__).resolve().parents[2]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app.routers.mini_games import mini_game_claim_submit
from app.services.auth_service import create_user
from app.services.pet_service import create_pet


class DummyRequest:
    def __init__(self, user_id: int, csrf_token: str):
        self.session = {"user_id": user_id, "csrf_token": csrf_token}


def test_mini_game_claim_does_not_refresh_other_user_pets(db_session):
    user = create_user(db_session, "minigame@example.com", "pass123456")
    pet_a = create_pet(db_session, user, name="A宠", species="基础宠物", color="粉色", personality="活泼")
    pet_b = create_pet(db_session, user, name="B宠", species="基础宠物", color="奶油白", personality="温柔")
    db_session.commit()

    pet_b.hunger = 40
    pet_b.cleanliness = 80
    pet_b.energy = 75
    pet_b.health = 88
    pet_b.mood = 82
    pet_b.last_tick_at = datetime.utcnow() - timedelta(hours=6)
    before_hunger = pet_b.hunger
    before_tick_at = pet_b.last_tick_at

    request = DummyRequest(user.id, "test-csrf-token")
    response = mini_game_claim_submit(
        request=request,
        pet_id=pet_a.id,
        game_type="shooting",
        difficulty="easy",
        weapon="machine_gun",
        score=24,
        csrf_token="test-csrf-token",
        db=db_session,
    )

    payload = json.loads(response.body.decode())

    assert payload["ok"] is True
    assert payload["pet_id"] == pet_a.id
    assert pet_b.hunger == before_hunger
    assert pet_b.last_tick_at == before_tick_at
