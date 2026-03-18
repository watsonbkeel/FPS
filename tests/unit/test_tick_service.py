from __future__ import annotations

from datetime import datetime, timedelta

from app.services.auth_service import create_user
from app.services.pet_service import create_pet
from app.services.tick_service import advance_pet_state


def test_tick_service_advances_once_per_hour(db_session):
    user = create_user(db_session, "tick@example.com", "pass123456")
    pet = create_pet(db_session, user, name="滴答", species="基础宠物", color="粉色", personality="活泼")
    db_session.commit()

    pet.last_tick_at = datetime.utcnow() - timedelta(hours=5, minutes=20)
    before_hunger = pet.hunger
    before_cleanliness = pet.cleanliness

    advance_pet_state(db_session, pet, now=datetime.utcnow())
    first_processed_at = pet.last_tick_at

    assert pet.age_hours == 5
    assert pet.hunger > before_hunger
    assert pet.cleanliness < before_cleanliness

    advance_pet_state(db_session, pet, now=first_processed_at)

    assert pet.age_hours == 5
    assert pet.last_tick_at == first_processed_at
