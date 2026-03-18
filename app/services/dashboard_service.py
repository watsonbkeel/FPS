from __future__ import annotations

from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from ..models import CircleMember, PetEvent, User
from .shop_service import inventory_map
from .pet_service import refresh_user_pets


def build_dashboard_context(db: Session, user: User, *, apply_hosting: bool = True) -> dict:
    pets = refresh_user_pets(db, user, apply_hosting=apply_hosting)
    pet_ids = [pet.id for pet in pets]

    recent_pet_events: list[PetEvent] = []
    events: list[PetEvent] = []
    coin_events: list[PetEvent] = []
    latest_coin_event_by_pet: dict[int, PetEvent] = {}

    if pet_ids:
        recent_pet_events = list(
            db.scalars(
                select(PetEvent)
                .where(PetEvent.pet_id.in_(pet_ids))
                .order_by(desc(PetEvent.created_at))
                .limit(40)
            )
        )
        events = recent_pet_events[:12]
        coin_events = [
            event
            for event in recent_pet_events
            if isinstance(event.metadata_json, dict) and event.metadata_json.get("coin_delta") is not None
        ][:12]
        for event in recent_pet_events:
            if (
                event.pet_id is not None
                and event.pet_id not in latest_coin_event_by_pet
                and isinstance(event.metadata_json, dict)
                and event.metadata_json.get("coin_delta") is not None
            ):
                latest_coin_event_by_pet[event.pet_id] = event

    circle_memberships = list(db.scalars(select(CircleMember).where(CircleMember.pet_id.in_(pet_ids)))) if pet_ids else []
    total_coins = sum(pet.coins for pet in pets)
    inventory = inventory_map(db, user)
    hosting_summary_by_pet = {
        pet.id: pet.hosting_policy.last_action_summary if pet.hosting_policy and pet.hosting_policy.last_action_summary else '尚未执行托管动作'
        for pet in pets
    }

    return {
        "pets": pets,
        "events": events,
        "coin_events": coin_events,
        "latest_coin_event_by_pet": latest_coin_event_by_pet,
        "circle_memberships": circle_memberships,
        "total_coins": total_coins,
        "inventory": inventory,
        "hosting_summary_by_pet": hosting_summary_by_pet,
    }
