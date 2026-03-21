from __future__ import annotations

from fastapi.testclient import TestClient

from app.config import settings
from app.main import app
from app.models import Pet, User
from app.services.mini_games.rewards import claim_mini_game_reward


def test_main_voxel_fps_route_redirects_to_public_standalone_url():
    client = TestClient(app)

    response = client.get("/pets/1/mini-games/voxel-fps", follow_redirects=False)

    assert response.status_code == 303
    assert response.headers["location"] == f"{settings.fps_public_base_url}/"


def test_voxel_fps_reward_no_longer_changes_pet_coins(db_session):
    user = User(email="voxel@example.com", password_hash="x")
    pet = Pet(
        user=user,
        name="方块宠",
        species="基础宠物",
        color="粉色",
        personality="活泼",
        stage="child",
        hunger=60,
        mood=70,
        cleanliness=70,
        health=80,
        energy=60,
        coins=25,
    )
    db_session.add(user)
    db_session.add(pet)
    db_session.flush()

    result = claim_mini_game_reward(
        db_session,
        pet,
        game_type="voxel_fps",
        difficulty="normal",
        score=88,
        weapon="voxel_rifle",
    )

    assert result["reward"] == 0
    assert result["coins_after"] == 25
    assert pet.coins == 25
