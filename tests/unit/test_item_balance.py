from sqlalchemy import select

from app.models import Inventory, Item, Pet, User
from app.services.pet_service import feed_pet, heal_pet


def create_pet_owner(db_session):
    user = User(email="items@example.com", password_hash="x")
    pet = Pet(
        user=user,
        name="道具测试宠物",
        species="基础宠物",
        color="粉色",
        personality="活泼",
        stage="child",
        hunger=60,
        mood=40,
        cleanliness=70,
        health=50,
        energy=30,
        coins=40,
    )
    db_session.add(user)
    db_session.add(pet)
    db_session.flush()
    return user, pet


def test_shop_foods_are_stronger_than_default_feed(db_session):
    default_hunger_gain = 8
    default_mood_gain = 1
    default_coin_gain = 1

    foods = list(db_session.scalars(select(Item).where(Item.category == "food")))
    assert foods

    for food in foods:
        effects = food.effect_json or {}
        hunger_gain = 0 - effects.get("hunger", 0)
        assert hunger_gain > default_hunger_gain
        assert effects.get("mood", 0) > default_mood_gain
        assert effects.get("coins", 0) > default_coin_gain


def test_energy_pill_only_restores_energy(db_session):
    user, pet = create_pet_owner(db_session)
    energy_pill = db_session.scalar(select(Item).where(Item.name == "精力丸"))
    assert energy_pill is not None

    db_session.add(Inventory(user=user, item=energy_pill, quantity=1))
    db_session.flush()

    before_health = pet.health
    before_energy = pet.energy
    before_mood = pet.mood

    heal_pet(db_session, pet, user=user, item_id=energy_pill.id)

    assert pet.health == before_health
    assert pet.energy == before_energy + 5
    assert pet.mood == before_mood + 1
