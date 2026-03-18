from __future__ import annotations

from app.services.auth_service import create_user
from app.services.hosting_service import apply_hosting_policy, set_hosting_policy
from app.services.pet_service import create_pet


def test_daily_hosting_recovers_pet_state(db_session):
    user = create_user(db_session, "host@example.com", "pass123456")
    pet = create_pet(db_session, user, name="托托", species="基础宠物", color="粉色", personality="温柔")
    db_session.commit()

    pet.hunger = 88
    pet.cleanliness = 20
    pet.health = 28
    pet.energy = 14
    set_hosting_policy(db_session, pet, "daily")
    summary = apply_hosting_policy(db_session, pet)

    assert summary is not None
    assert pet.hunger < 88
    assert pet.cleanliness > 20
    assert pet.health > 28
    assert pet.energy > 14


def test_full_hosting_restores_low_stats_to_full(db_session):
    user = create_user(db_session, "fullhost@example.com", "pass123456")
    pet = create_pet(db_session, user, name="满满", species="基础宠物", color="粉色", personality="温柔")
    db_session.commit()

    pet.hunger = 84
    pet.cleanliness = 22
    pet.health = 26
    pet.energy = 18
    pet.mood = 24

    set_hosting_policy(db_session, pet, "full")
    summary = apply_hosting_policy(db_session, pet)

    assert summary is not None
    assert pet.health == 100
    assert pet.cleanliness == 100
    assert pet.energy == 100
    assert pet.mood == 100
    assert 100 - pet.hunger == 100
    assert "自动治疗" in summary
    assert "自动喂食" in summary
