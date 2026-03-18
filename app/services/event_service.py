from __future__ import annotations

from sqlalchemy.orm import Session

from ..models import Circle, Pet, PetEvent, User


def log_event(
    db: Session,
    *,
    pet: Pet | None,
    event_type: str,
    message: str,
    user: User | None = None,
    circle: Circle | None = None,
    metadata: dict | None = None,
) -> PetEvent:
    event = PetEvent(
        pet=pet,
        user_id=user.id if user else None,
        circle_id=circle.id if circle else None,
        event_type=event_type,
        message=message,
        metadata_json=metadata or {},
    )
    db.add(event)
    return event
