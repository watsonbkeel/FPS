from __future__ import annotations

from typing import TypedDict

from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from ..constants import HEAL_COST
from ..models import CircleMember, HostingPolicy, Inventory, Item, Pet, PetLineage, PetRelationship, User
from .event_service import log_event
from .tick_service import advance_pet_state, clamp


def create_pet(
    db: Session,
    user: User,
    *,
    name: str,
    species: str,
    color: str,
    personality: str,
    gender: str = "male",
    appearance_style: str = "classic",
) -> Pet:
    pet = Pet(
        user=user,
        name=name,
        species=species,
        gender=gender,
        appearance_style=appearance_style,
        color=color,
        personality=personality,
        stage="egg",
        growth_path="稳健型",
    )
    db.add(pet)
    db.flush()
    policy = HostingPolicy(pet=pet, mode="off", auto_social_enabled=False)
    db.add(policy)
    log_event(db, pet=pet, user=user, event_type="pet_created", message=f"{pet.name} 破壳加入了家庭")
    return pet


def get_user_pet(db: Session, user: User, pet_id: int) -> Pet | None:
    return db.scalar(select(Pet).where(Pet.id == pet_id, Pet.user_id == user.id))


def get_recent_events(db: Session, pet: Pet, limit: int = 10):
    return list(db.scalars(select(PetEvent).where(PetEvent.pet_id == pet.id).order_by(desc(PetEvent.created_at)).limit(limit)))


def refresh_pet(db: Session, pet: Pet, *, apply_hosting: bool = False) -> None:
    advance_pet_state(db, pet)
    if apply_hosting:
        from .hosting_service import apply_hosting_policy

        apply_hosting_policy(db, pet)


def refresh_user_pets(db: Session, user: User, *, apply_hosting: bool = False) -> list[Pet]:
    pets = list(db.scalars(select(Pet).where(Pet.user_id == user.id).order_by(Pet.created_at.desc())))
    for pet in pets:
        refresh_pet(db, pet, apply_hosting=apply_hosting)
    return pets


def _coin_metadata(delta: int, pet: Pet, source: str) -> dict[str, int | str]:
    return {
        "coin_delta": delta,
        "coins_after": pet.coins,
        "coin_source": source,
    }


def _effect_value(effect_json: dict[str, object] | None, key: str, default: int = 0) -> int:
    raw = (effect_json or {}).get(key, default)
    return raw if isinstance(raw, int) else default


def feed_pet(db: Session, pet: Pet, *, actor_label: str = "主人", user: User | None = None, item_id: int | None = None) -> int:
    coin_gain = 1
    base_effect = {"hunger": -8, "mood": 1, "health": 0, "energy": 0, "coins": 1}
    item_used = None
    if item_id:
        inventory_entry = db.scalar(
            select(Inventory)
            .join(Item, Item.id == Inventory.item_id)
            .where(Inventory.user_id == (user.id if user else pet.user_id), Inventory.item_id == item_id, Inventory.quantity > 0)
        )
        if not inventory_entry or inventory_entry.item.category != "food":
            raise ValueError("选择的食物不存在或数量不足")
        item_used = inventory_entry.item
        effects = item_used.effect_json or {}
        base_effect = {
            "hunger": _effect_value(effects, "hunger", -30),
            "mood": _effect_value(effects, "mood", 8),
            "health": _effect_value(effects, "health", 0),
            "energy": _effect_value(effects, "energy", 0),
            "coins": _effect_value(effects, "coins", 2),
        }
        inventory_entry.quantity -= 1

    previous_hunger = pet.hunger
    pet.hunger = clamp(pet.hunger + base_effect["hunger"])
    pet.mood = clamp(pet.mood + base_effect["mood"])
    pet.health = clamp(pet.health + base_effect["health"])
    pet.energy = clamp(pet.energy + base_effect["energy"])
    pet.coins += base_effect["coins"]
    coin_gain = base_effect["coins"]
    if previous_hunger <= 15 and not item_used:
        pet.health = clamp(pet.health - 2)
    pet.care_score = min(100.0, pet.care_score + 2)
    used_text = f"，使用了 {item_used.name}" if item_used else ""
    log_event(
        db,
        pet=pet,
        event_type="feed",
        message=f"{actor_label}给 {pet.name} 喂了食物{used_text}，获得 {coin_gain} 金币，当前剩余 {pet.coins} 金币",
        metadata=_coin_metadata(coin_gain, pet, "feed"),
    )
    return coin_gain


def play_pet(db: Session, pet: Pet, *, actor_label: str = "主人") -> int:
    pet.mood = clamp(pet.mood + 14)
    pet.energy = clamp(pet.energy - 12)
    pet.hunger = clamp(pet.hunger + 4)
    pet.coins += 6
    pet.relationship_score += 1
    pet.care_score = min(100.0, pet.care_score + 3)
    log_event(
        db,
        pet=pet,
        event_type="play",
        message=f"{actor_label}陪 {pet.name} 玩耍了一会儿，获得 6 金币，当前剩余 {pet.coins} 金币",
        metadata=_coin_metadata(6, pet, "play"),
    )
    return 6


def clean_pet(db: Session, pet: Pet, *, actor_label: str = "主人") -> int:
    pet.cleanliness = clamp(pet.cleanliness + 26)
    pet.mood = clamp(pet.mood + 4)
    pet.health = clamp(pet.health + 3)
    pet.coins += 3
    pet.care_score = min(100.0, pet.care_score + 2)
    log_event(
        db,
        pet=pet,
        event_type="clean",
        message=f"{actor_label}帮 {pet.name} 做了清理，获得 3 金币，当前剩余 {pet.coins} 金币",
        metadata=_coin_metadata(3, pet, "clean"),
    )
    return 3


def sleep_pet(
    db: Session,
    pet: Pet,
    *,
    actor_label: str = "主人",
    user: User | None = None,
    item_id: int | None = None,
) -> tuple[int, str | None]:
    if item_id:
        energy_entry = db.scalar(
            select(Inventory)
            .join(Item, Item.id == Inventory.item_id)
            .where(Inventory.user_id == (user.id if user else pet.user_id), Inventory.item_id == item_id, Inventory.quantity > 0)
        )
        if not energy_entry or energy_entry.item.category != "medicine":
            raise ValueError("选择的精力道具不存在或数量不足")
        effects = energy_entry.item.effect_json or {}
        energy_gain = _effect_value(effects, "energy", 0)
        if energy_gain <= 0:
            raise ValueError("该道具不能用于补充精力")

        energy_entry.quantity -= 1
        pet.is_sleeping = False
        pet.energy = clamp(pet.energy + energy_gain)
        pet.mood = clamp(pet.mood + _effect_value(effects, "mood", 0))
        pet.health = clamp(pet.health + _effect_value(effects, "health", 0))
        pet.care_score = min(100.0, pet.care_score + 1)
        log_event(
            db,
            pet=pet,
            event_type="sleep_item",
            message=f"{actor_label}为 {pet.name} 使用了 {energy_entry.item.name}，恢复精力，当前剩余 {pet.coins} 金币",
            metadata=_coin_metadata(0, pet, "sleep_item"),
        )
        return 0, energy_entry.item.name

    pet.is_sleeping = True
    pet.energy = clamp(pet.energy + (10 if pet.hunger >= 80 else 18))
    pet.mood = clamp(pet.mood + 2)
    pet.coins += 2
    pet.care_score = min(100.0, pet.care_score + 2)
    log_event(
        db,
        pet=pet,
        event_type="sleep",
        message=f"{actor_label}安排 {pet.name} 去睡觉，获得 2 金币，当前剩余 {pet.coins} 金币",
        metadata=_coin_metadata(2, pet, "sleep"),
    )
    return 2, None


class HealPlan(TypedDict):
    label: str
    cost: int
    health: int
    mood: int


HEAL_PLANS: dict[str, HealPlan] = {
    "basic": {"label": "基础治疗", "cost": HEAL_COST, "health": 24, "mood": 1},
    "plus": {"label": "强化治疗", "cost": HEAL_COST * 2, "health": 34, "mood": 3},
    "premium": {"label": "高效治疗", "cost": HEAL_COST * 3, "health": 46, "mood": 5},
}


def heal_pet(
    db: Session,
    pet: Pet,
    *,
    actor_label: str = "主人",
    free: bool = False,
    plan: str = "basic",
    user: User | None = None,
    item_id: int | None = None,
) -> int:
    plan_conf = HEAL_PLANS.get(plan, HEAL_PLANS["basic"])
    medicine_entry = None
    if item_id:
        medicine_entry = db.scalar(
            select(Inventory)
            .join(Item, Item.id == Inventory.item_id)
            .where(Inventory.user_id == (user.id if user else pet.user_id), Inventory.item_id == item_id, Inventory.quantity > 0)
        )
        if not medicine_entry or medicine_entry.item.category != "medicine":
            raise ValueError("选择的药剂不存在或数量不足")
    if not free and not medicine_entry and pet.coins < plan_conf["cost"]:
        raise ValueError("金币不足，无法治病")

    coin_delta = 0
    if medicine_entry:
        effects = medicine_entry.item.effect_json or {}
        health_gain = _effect_value(effects, "health", 0)
        mood_gain = _effect_value(effects, "mood", 0)
        energy_gain = _effect_value(effects, "energy", 0)
        medicine_entry.quantity -= 1
        message = f"{actor_label}为 {pet.name} 使用了 {medicine_entry.item.name}"
    else:
        health_gain = plan_conf["health"]
        mood_gain = plan_conf["mood"]
        energy_gain = 0
        if not free:
            pet.coins -= plan_conf["cost"]
            coin_delta = -plan_conf["cost"]
        message = f"{actor_label}为 {pet.name} 做了{plan_conf['label']}"

    pet.health = clamp(pet.health + health_gain)
    pet.mood = clamp(pet.mood + mood_gain)
    pet.energy = clamp(pet.energy + energy_gain)
    pet.care_score = min(100.0, pet.care_score + 1)

    if free:
        message = f"{message}（托管免费执行），当前剩余 {pet.coins} 金币"
    elif coin_delta != 0:
        message = f"{message}，花费 {abs(coin_delta)} 金币，当前剩余 {pet.coins} 金币"
    else:
        message = f"{message}，当前剩余 {pet.coins} 金币"

    log_event(db, pet=pet, event_type="heal", message=message, metadata=_coin_metadata(coin_delta, pet, "heal"))
    return coin_delta


def get_family_data(db: Session, pet: Pet) -> tuple[list[Pet], list[Pet]]:
    parents = [link.parent_pet for link in pet.parent_links]
    children = [link.child_pet for link in pet.child_links]
    return parents, children


def get_circle_ids_for_pet(db: Session, pet: Pet) -> list[int]:
    return [row.circle_id for row in db.scalars(select(CircleMember).where(CircleMember.pet_id == pet.id))]


def get_relationship(db: Session, pet_a: Pet, pet_b: Pet) -> PetRelationship | None:
    low_id, high_id = sorted((pet_a.id, pet_b.id))
    return db.scalar(select(PetRelationship).where(PetRelationship.pet_id == low_id, PetRelationship.other_pet_id == high_id))


def eligible_breed_partners(db: Session, pet: Pet) -> list[Pet]:
    if pet.stage != "adult":
        return []
    circle_ids = get_circle_ids_for_pet(db, pet)
    if not circle_ids:
        return []
    partner_candidates = list(
        db.scalars(
            select(Pet)
            .join(CircleMember, CircleMember.pet_id == Pet.id)
            .where(CircleMember.circle_id.in_(circle_ids), Pet.id != pet.id, Pet.stage == "adult", Pet.is_alive.is_(True))
        )
    )
    partners: list[Pet] = []
    for candidate in partner_candidates:
        relation = get_relationship(db, pet, candidate)
        if relation and relation.score >= 60:
            partners.append(candidate)
    return partners


def breed_pet(db: Session, parent: Pet, partner: Pet, owner: User) -> Pet:
    if parent.stage != "adult" or partner.stage != "adult":
        raise ValueError("只有成年宠物可以繁殖")
    relation = get_relationship(db, parent, partner)
    if not relation or relation.score < 60:
        raise ValueError("关系值不足，暂时无法繁殖")

    child_color = parent.color if parent.relationship_score >= partner.relationship_score else partner.color
    child_personality = parent.personality if parent.care_score >= partner.care_score else partner.personality
    child_species = parent.species
    child_name = f"{parent.name}二代"

    child = Pet(
        user=owner,
        name=child_name,
        species=child_species,
        gender="female" if (parent.id + partner.id) % 2 == 0 else "male",
        appearance_style=parent.appearance_style if parent.care_score >= partner.care_score else partner.appearance_style,
        color=child_color,
        personality=child_personality,
        stage="egg",
        age_hours=0,
        hunger=18,
        mood=86,
        cleanliness=88,
        health=90,
        energy=82,
        relationship_score=0,
        coins=20,
        care_score=(parent.care_score + partner.care_score) / 2,
        growth_path="稳健型",
    )
    db.add(child)
    db.flush()
    db.add(HostingPolicy(pet=child, mode="off", auto_social_enabled=False))
    db.add(PetLineage(parent_pet=parent, child_pet=child))
    db.add(PetLineage(parent_pet=partner, child_pet=child))
    db.flush()

    parent.relationship_score += 4
    partner.relationship_score += 4
    log_event(db, pet=parent, user=owner, event_type="breed", message=f"{parent.name} 和 {partner.name} 迎来了下一代 {child.name}")
    log_event(db, pet=partner, event_type="breed", message=f"{partner.name} 和 {parent.name} 迎来了下一代 {child.name}")
    log_event(db, pet=child, user=owner, event_type="born", message=f"{child.name} 作为新一代宠物诞生")
    return child


from ..models import PetEvent  # noqa: E402
