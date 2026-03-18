from __future__ import annotations

from datetime import datetime
from collections import Counter

from sqlalchemy.orm import Session

from ..models import HostingPolicy, Pet
from .circle_service import auto_social_interaction
from .event_service import log_event
from .pet_service import clean_pet, feed_pet, heal_pet, play_pet, sleep_pet


def get_or_create_policy(db: Session, pet: Pet) -> HostingPolicy:
    if pet.hosting_policy:
        return pet.hosting_policy
    policy = HostingPolicy(pet=pet, mode=pet.hosting_mode, auto_social_enabled=pet.auto_social_enabled)
    db.add(policy)
    db.flush()
    return policy


def set_hosting_policy(db: Session, pet: Pet, mode: str) -> HostingPolicy:
    policy = get_or_create_policy(db, pet)
    pet.hosting_mode = mode
    pet.auto_social_enabled = mode == "social"
    policy.mode = mode
    policy.auto_social_enabled = mode == "social"
    policy.last_action_summary = "托管设置已更新，等待下一次时间推进"
    log_event(db, pet=pet, event_type="hosting_update", message=f"{pet.name} 的托管模式调整为 {mode}")
    return policy


def apply_hosting_policy(db: Session, pet: Pet) -> str | None:
    if pet.hosting_mode == "off" or not pet.is_alive:
        return None

    policy = get_or_create_policy(db, pet)
    current_slot = datetime.utcnow().replace(minute=0, second=0, microsecond=0)
    if policy.last_executed_at and policy.last_executed_at >= current_slot:
        return None

    actions: list[str] = []

    if pet.hosting_mode == "full":
        action_counts: Counter[str] = Counter()
        fullness = 100 - pet.hunger
        needs = [pet.health, fullness, pet.cleanliness, pet.energy, pet.mood]
        if min(needs) < 60:
            for _ in range(40):
                fullness = 100 - pet.hunger
                needs = [
                    ("heal", pet.health),
                    ("feed", fullness),
                    ("clean", pet.cleanliness),
                    ("sleep", pet.energy),
                    ("play", pet.mood),
                ]
                lowest_action, lowest_value = min(needs, key=lambda item: item[1])
                if lowest_value >= 100:
                    break

                if lowest_action == "heal":
                    while pet.health < 100:
                        heal_pet(db, pet, actor_label="全托管", free=True)
                        action_counts["自动治疗"] += 1
                    continue
                if lowest_action == "feed":
                    while (100 - pet.hunger) < 100:
                        feed_pet(db, pet, actor_label="全托管")
                        action_counts["自动喂食"] += 1
                    continue
                if lowest_action == "clean":
                    while pet.cleanliness < 100:
                        clean_pet(db, pet, actor_label="全托管")
                        action_counts["自动清洁"] += 1
                    continue
                if lowest_action == "sleep":
                    while pet.energy < 100:
                        sleep_pet(db, pet, actor_label="全托管")
                        action_counts["安排睡觉"] += 1
                    continue
                if lowest_action == "play":
                    while pet.mood < 100:
                        play_pet(db, pet, actor_label="全托管")
                        action_counts["自动玩耍"] += 1
                    continue

        actions.extend([f"{name}x{count}" for name, count in action_counts.items()])

    if pet.hosting_mode in {"survival", "daily", "social"}:
        if pet.health <= 35:
            heal_pet(db, pet, actor_label="托管", free=True)
            actions.append("自动治疗")
        if pet.hunger >= (90 if pet.hosting_mode == "survival" else 65):
            feed_pet(db, pet, actor_label="托管")
            actions.append("自动喂食")
        if pet.cleanliness <= (15 if pet.hosting_mode == "survival" else 45):
            clean_pet(db, pet, actor_label="托管")
            actions.append("自动清洁")
        if pet.energy <= (10 if pet.hosting_mode == "survival" else 40):
            sleep_pet(db, pet, actor_label="托管")
            actions.append("安排睡觉")

    if pet.hosting_mode == "social":
        social_result = auto_social_interaction(db, pet)
        if social_result:
            actions.append("自动社交")

    summary = "、".join(actions) if actions else "当前状态稳定，本轮无需额外干预"
    policy.last_executed_at = current_slot
    policy.last_action_summary = summary
    log_event(db, pet=pet, event_type="hosting_run", message=f"托管执行结果：{summary}")
    return summary
