from __future__ import annotations

from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from ..constants import GROWTH_PATHS
from ..models import Pet
from .event_service import log_event


def clamp(value: float, low: int = 0, high: int = 100) -> int:
    return max(low, min(high, int(round(value))))


def determine_stage(age_hours: int) -> str:
    if age_hours < 12:
        return "egg"
    if age_hours < 72:
        return "baby"
    if age_hours < 168:
        return "child"
    if age_hours < 336:
        return "teen"
    return "adult"


def determine_growth_path(care_score: float) -> str:
    if care_score >= 78:
        return GROWTH_PATHS["bright"]
    if care_score >= 55:
        return GROWTH_PATHS["steady"]
    return GROWTH_PATHS["scrappy"]


def snapshot_care_score(pet: Pet) -> float:
    return (
        (100 - pet.hunger)
        + pet.mood
        + pet.cleanliness
        + pet.health
        + pet.energy
    ) / 5


def advance_pet_state(db: Session, pet: Pet, now: datetime | None = None) -> list[str]:
    now = now or datetime.utcnow()
    if not pet.last_tick_at:
        pet.last_tick_at = now
        return []

    elapsed_hours = int((now - pet.last_tick_at).total_seconds() // 3600)
    if elapsed_hours <= 0 or not pet.is_alive:
        return []

    notes: list[str] = []
    previous_stage = pet.stage
    was_alive = pet.is_alive

    for _ in range(elapsed_hours):
        pet.age_hours += 1
        pet.hunger = clamp(pet.hunger + 4)
        pet.cleanliness = clamp(pet.cleanliness - 3)

        if pet.is_sleeping:
            energy_gain = 3 if pet.hunger >= 80 else 6
            pet.energy = clamp(pet.energy + energy_gain)
            if pet.energy >= 88:
                pet.is_sleeping = False
                notes.append("自然醒来")
        else:
            pet.energy = clamp(pet.energy - 4)

        mood_delta = -1
        if pet.hunger >= 70:
            mood_delta -= 2
        if pet.cleanliness <= 30:
            mood_delta -= 2
        if pet.energy <= 20:
            mood_delta -= 1
        pet.mood = clamp(pet.mood + mood_delta)

        if pet.hunger >= 85 or pet.cleanliness <= 20 or pet.energy <= 15:
            pet.health = clamp(pet.health - 4)
        elif pet.hunger <= 45 and pet.cleanliness >= 55 and pet.energy >= 45:
            pet.health = clamp(pet.health + 1)

        pet.care_score = ((pet.care_score * 4) + snapshot_care_score(pet)) / 5

        if pet.health <= 0:
            pet.health = 0
            pet.is_alive = False
            break

    pet.stage = determine_stage(pet.age_hours)
    pet.last_tick_at = pet.last_tick_at + timedelta(hours=elapsed_hours)

    if pet.stage == "adult":
        pet.growth_path = determine_growth_path(pet.care_score)

    if pet.stage != previous_stage:
        log_event(db, pet=pet, event_type="stage", message=f"{pet.name} 成长到了 {pet.stage} 阶段")
    if was_alive and not pet.is_alive:
        log_event(db, pet=pet, event_type="death", message=f"{pet.name} 因状态过差离开了你")
    if notes:
        log_event(db, pet=pet, event_type="tick", message=f"时间推进 {elapsed_hours} 小时：{'，'.join(notes)}")
    return notes
