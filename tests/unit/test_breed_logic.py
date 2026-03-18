from __future__ import annotations

from sqlalchemy import select

from app.models import PetLineage
from app.services.auth_service import create_user
from app.services.circle_service import create_circle, join_circle, relationship_record
from app.services.pet_service import breed_pet, create_pet


def test_breed_creates_child_and_lineage(db_session):
    owner = create_user(db_session, "breed@example.com", "pass123456")
    partner_owner = create_user(db_session, "partner@example.com", "pass123456")
    parent = create_pet(db_session, owner, name="芽芽", species="基础宠物", color="粉色", personality="活泼")
    partner = create_pet(db_session, partner_owner, name="果果", species="基础宠物", color="晴空蓝", personality="温柔")
    circle = create_circle(db_session, owner, "育成圈", "用于繁殖测试")
    join_circle(db_session, circle, parent)
    join_circle(db_session, circle, partner)

    parent.stage = "adult"
    partner.stage = "adult"
    relation = relationship_record(db_session, parent, partner)
    relation.score = 72

    child = breed_pet(db_session, parent, partner, owner)
    lineages = list(db_session.scalars(select(PetLineage).where(PetLineage.child_pet_id == child.id)))

    assert child.stage == "egg"
    assert child.user_id == owner.id
    assert len(lineages) == 2
