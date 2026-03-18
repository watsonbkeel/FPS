from __future__ import annotations

from app.services.auth_service import create_user
from app.services.circle_service import create_circle, interact, join_circle, relationship_record
from app.services.pet_service import create_pet


def test_circle_interaction_updates_relationship_and_events(db_session):
    user_a = create_user(db_session, "a@example.com", "pass123456")
    user_b = create_user(db_session, "b@example.com", "pass123456")
    pet_a = create_pet(db_session, user_a, name="团团", species="基础宠物", color="粉色", personality="活泼")
    pet_b = create_pet(db_session, user_b, name="圆圆", species="基础宠物", color="奶油白", personality="稳重")
    circle = create_circle(db_session, user_a, "测试圈", "给单测用的圈子")
    join_circle(db_session, circle, pet_a)
    join_circle(db_session, circle, pet_b)

    message = interact(db_session, circle, pet_a, pet_b, "visit", user_a)
    relationship = relationship_record(db_session, pet_a, pet_b)

    assert "拜访" in message
    assert relationship.score > 0
    assert len(circle.events) >= 2
