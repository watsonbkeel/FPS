from __future__ import annotations

from datetime import datetime, timedelta

from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from ..constants import INTERACTION_COOLDOWN_HOURS, INTERACTION_TYPES
from ..models import Circle, CircleMember, Pet, PetEvent, PetRelationship, User
from .event_service import log_event
from .shop_service import consume_gift_item
from .tick_service import clamp


def create_circle(db: Session, owner: User, name: str, description: str) -> Circle:
    circle = Circle(owner=owner, name=name, description=description)
    db.add(circle)
    db.flush()
    return circle


def get_circle(db: Session, circle_id: int) -> Circle | None:
    return db.get(Circle, circle_id)


def list_circles(db: Session) -> list[Circle]:
    return list(db.scalars(select(Circle).order_by(Circle.created_at.desc())))


def recent_circle_events(db: Session, circle: Circle, limit: int = 10) -> list[PetEvent]:
    return list(db.scalars(select(PetEvent).where(PetEvent.circle_id == circle.id).order_by(desc(PetEvent.created_at)).limit(limit)))


def is_pet_in_circle(db: Session, circle: Circle, pet: Pet) -> bool:
    return db.scalar(select(CircleMember).where(CircleMember.circle_id == circle.id, CircleMember.pet_id == pet.id)) is not None


def join_circle(db: Session, circle: Circle, pet: Pet) -> CircleMember:
    existing = db.scalar(select(CircleMember).where(CircleMember.circle_id == circle.id, CircleMember.pet_id == pet.id))
    if existing:
        return existing
    member = CircleMember(circle=circle, pet=pet)
    db.add(member)
    db.flush()
    log_event(db, pet=pet, circle=circle, event_type="circle_join", message=f"{pet.name} 加入了圈子 {circle.name}")
    return member


def relationship_record(db: Session, pet_a: Pet, pet_b: Pet) -> PetRelationship:
    low_id, high_id = sorted((pet_a.id, pet_b.id))
    record = db.scalar(select(PetRelationship).where(PetRelationship.pet_id == low_id, PetRelationship.other_pet_id == high_id))
    if record:
        return record
    record = PetRelationship(pet_id=low_id, other_pet_id=high_id, score=0)
    db.add(record)
    db.flush()
    return record


def _apply_interaction_effects(actor_pet: Pet, target_pet: Pet, action_type: str) -> tuple[str, int, int]:
    if action_type == "visit":
        actor_pet.mood = clamp(actor_pet.mood + 6)
        target_pet.mood = clamp(target_pet.mood + 4)
        actor_pet.coins += 2
        return "轻松拜访", 2, 0
    if action_type == "gift":
        actor_pet.mood = clamp(actor_pet.mood + 4)
        target_pet.mood = clamp(target_pet.mood + 8)
        return "送出一份礼物", 0, 0
    if action_type == "play":
        actor_pet.mood = clamp(actor_pet.mood + 8)
        target_pet.mood = clamp(target_pet.mood + 8)
        actor_pet.energy = clamp(actor_pet.energy - 6)
        target_pet.energy = clamp(target_pet.energy - 6)
        actor_pet.coins += 4
        target_pet.coins += 4
        return "一起玩得很开心", 4, 4
    actor_pet.mood = clamp(actor_pet.mood + 5)
    target_pet.mood = clamp(target_pet.mood + 5)
    actor_pet.health = clamp(actor_pet.health + 2)
    target_pet.health = clamp(target_pet.health + 2)
    actor_pet.coins += 8
    target_pet.coins += 8
    return "完成了结伴任务", 8, 8


def interact(db: Session, circle: Circle, actor_pet: Pet, target_pet: Pet, action_type: str, acting_user: User) -> str:
    if actor_pet.id == target_pet.id:
        raise ValueError("不能和自己互动")
    if not is_pet_in_circle(db, circle, actor_pet) or not is_pet_in_circle(db, circle, target_pet):
        raise ValueError("双方都需要在圈子内")

    relation = relationship_record(db, actor_pet, target_pet)
    now = datetime.utcnow()
    if relation.last_interaction_at and relation.last_interaction_at > now - timedelta(hours=INTERACTION_COOLDOWN_HOURS):
        raise ValueError("互动还在冷却中，请稍后再试")

    if action_type == "gift" and not consume_gift_item(db, acting_user):
        raise ValueError("背包里没有可送出的礼物")

    result_text, actor_coin_delta, target_coin_delta = _apply_interaction_effects(actor_pet, target_pet, action_type)
    relation.score += {"visit": 8, "gift": 12, "play": 10, "quest": 14}[action_type]
    relation.last_interaction_at = now
    actor_pet.relationship_score += 2
    target_pet.relationship_score += 2

    action_label = INTERACTION_TYPES[action_type]
    shared_message = f"{actor_pet.name} 对 {target_pet.name} 发起了 {action_label}，{result_text}"
    actor_message = shared_message if actor_coin_delta == 0 else f"{shared_message}，获得 {actor_coin_delta} 金币，当前剩余 {actor_pet.coins} 金币"
    target_message = shared_message if target_coin_delta == 0 else f"{shared_message}，获得 {target_coin_delta} 金币，当前剩余 {target_pet.coins} 金币"
    log_event(
        db,
        pet=actor_pet,
        user=acting_user,
        circle=circle,
        event_type="circle_interaction",
        message=actor_message,
        metadata={"coin_delta": actor_coin_delta, "coins_after": actor_pet.coins, "coin_source": f"circle_{action_type}"},
    )
    log_event(
        db,
        pet=target_pet,
        circle=circle,
        event_type="circle_interaction",
        message=target_message,
        metadata={"coin_delta": target_coin_delta, "coins_after": target_pet.coins, "coin_source": f"circle_{action_type}"},
    )
    return shared_message


def primary_circle_for_pet(db: Session, pet: Pet) -> Circle | None:
    member = db.scalar(select(CircleMember).where(CircleMember.pet_id == pet.id).order_by(CircleMember.joined_at.asc()))
    if not member:
        return None
    return member.circle


def auto_social_interaction(db: Session, pet: Pet) -> str | None:
    circle = primary_circle_for_pet(db, pet)
    if not circle:
        return None
    peers = [member.pet for member in circle.members if member.pet_id != pet.id and member.pet.is_alive]
    if not peers:
        return None
    target = peers[0]
    relation = relationship_record(db, pet, target)
    now = datetime.utcnow()
    if relation.last_interaction_at and relation.last_interaction_at > now - timedelta(hours=INTERACTION_COOLDOWN_HOURS):
        return None
    action_type = "visit" if pet.energy < 35 else "play"
    _, pet_coin_delta, target_coin_delta = _apply_interaction_effects(pet, target, action_type)
    relation.score += 6 if action_type == "visit" else 8
    relation.last_interaction_at = now
    message = f"托管让 {pet.name} 和 {target.name} 完成了 {INTERACTION_TYPES[action_type]}"
    log_event(
        db,
        pet=pet,
        circle=circle,
        event_type="hosting_social",
        message=f"{message}，获得 {pet_coin_delta} 金币，当前剩余 {pet.coins} 金币",
        metadata={"coin_delta": pet_coin_delta, "coins_after": pet.coins, "coin_source": f"hosting_{action_type}"},
    )
    log_event(
        db,
        pet=target,
        circle=circle,
        event_type="hosting_social",
        message=f"{message}，获得 {target_coin_delta} 金币，当前剩余 {target.coins} 金币",
        metadata={"coin_delta": target_coin_delta, "coins_after": target.coins, "coin_source": f"hosting_{action_type}"},
    )
    return message
