import os
import re
import uuid
from playwright.sync_api import Browser, Page, expect

BASE_URL = os.getenv("BASE_URL", "http://127.0.0.1:18427")
FPS_BASE_URL = os.getenv("FPS_BASE_URL", "http://127.0.0.1:18428")


def unique_email():
    return f"u_{uuid.uuid4().hex[:8]}@example.com"


def open_voxel_fps_for_fresh_pet(page: Page, pet_name: str):
    email = unique_email()
    password = "pass123456"

    page.goto(f"{BASE_URL}/register")
    page.get_by_label("邮箱").fill(email)
    page.get_by_label("密码").fill(password)
    page.get_by_label("确认密码").fill(password)
    page.get_by_role("button", name="注册").click()
    expect(page).to_have_url(f"{BASE_URL}/dashboard")

    page.get_by_role("link", name="新建宠物").click()
    expect(page).to_have_url(f"{BASE_URL}/pets/new")
    page.get_by_label("名字").fill(pet_name)
    page.get_by_label("物种").select_option(label="基础宠物")
    page.get_by_label("颜色").select_option(label="粉色")
    page.get_by_label("性格").select_option(label="活泼")
    page.get_by_role("button", name="创建宠物").click()

    page.goto(f"{BASE_URL}/dashboard")
    page.locator("[data-pet-card]").first.get_by_role("link", name="方块 FPS").click()
    expect(page).to_have_url(f"{FPS_BASE_URL}/")
    page.get_by_label("昵称").fill(pet_name)
    page.get_by_role("button", name="进入方块战场").click()
    expect(page).to_have_url(f"{FPS_BASE_URL}/play")



def test_homepage_loads(page: Page):
    page.goto(BASE_URL)
    expect(page).to_have_url(f"{BASE_URL}/")
    expect(page.locator("body")).to_be_visible()


def test_register_login_create_pet_and_hosting(page: Page):
    email = unique_email()
    password = "pass123456"

    page.goto(f"{BASE_URL}/register")
    page.get_by_label("邮箱").fill(email)
    page.get_by_label("密码").fill(password)
    page.get_by_label("确认密码").fill(password)
    page.get_by_role("button", name="注册").click()

    if "/login" not in page.url:
        page.goto(f"{BASE_URL}/login")

    page.get_by_label("邮箱").fill(email)
    page.get_by_label("密码").fill(password)
    page.get_by_role("button", name="登录").click()

    expect(page).to_have_url(f"{BASE_URL}/dashboard")

    page.get_by_role("link", name="新建宠物").click()
    expect(page).to_have_url(f"{BASE_URL}/pets/new")

    pet_name = "团子"
    page.get_by_label("名字").fill(pet_name)
    page.get_by_label("物种").select_option(label="基础宠物")
    page.get_by_label("颜色").select_option(label="粉色")
    page.get_by_label("性格").select_option(label="活泼")
    page.get_by_role("button", name="创建宠物").click()

    expect(page.locator("body")).to_contain_text(pet_name)

    page.get_by_role("button", name="喂食").click()
    expect(page.locator("body")).to_contain_text("已喂食")

    page.get_by_role("button", name="玩耍").click()
    expect(page.locator("body")).to_contain_text("玩耍完成")

    page.get_by_role("link", name="托管设置").click()
    expect(page.locator("body")).to_contain_text("托管")
    page.get_by_label("托管模式").select_option(label="生活托管")
    page.get_by_role("button", name="保存设置").click()
    expect(page.locator("body")).to_contain_text("托管设置已保存")


def test_circle_flow(page: Page, browser: Browser):
    password = "pass123456"
    email_a = unique_email()
    email_b = unique_email()
    circle_name = f"联调圈-{uuid.uuid4().hex[:6]}"
    circle_desc = "用于验证加入圈子与结构化互动"

    def register_and_create_pet(target_page: Page, email: str, pet_name: str):
        target_page.goto(f"{BASE_URL}/register")
        target_page.get_by_label("邮箱").fill(email)
        target_page.get_by_label("密码").fill(password)
        target_page.get_by_label("确认密码").fill(password)
        target_page.get_by_role("button", name="注册").click()

        expect(target_page).to_have_url(f"{BASE_URL}/dashboard")
        target_page.get_by_role("link", name="新建宠物").click()
        expect(target_page).to_have_url(f"{BASE_URL}/pets/new")
        target_page.get_by_label("名字").fill(pet_name)
        target_page.get_by_label("物种").select_option(label="基础宠物")
        target_page.get_by_label("颜色").select_option(label="粉色")
        target_page.get_by_label("性格").select_option(label="活泼")
        target_page.get_by_role("button", name="创建宠物").click()
        expect(target_page.locator("body")).to_contain_text(pet_name)

    second_context = browser.new_context()
    second_page = second_context.new_page()
    try:
        register_and_create_pet(page, email_a, "圈圈")
        page.goto(f"{BASE_URL}/circles")
        page.get_by_role("link", name="创建圈子").click()
        page.get_by_label("圈子名称").fill(circle_name)
        page.get_by_label("圈子简介").fill(circle_desc)
        page.get_by_role("button", name="创建").click()
        expect(page.locator("body")).to_contain_text(circle_name)
        page.get_by_role("button", name="加入圈子").click()
        expect(page.locator("body")).to_contain_text("已加入圈子")
        expect(page.locator("body")).to_contain_text("圈圈")

        register_and_create_pet(second_page, email_b, "团团")
        second_page.goto(page.url)
        expect(second_page.locator("body")).to_contain_text(circle_name)
        second_page.get_by_role("button", name="加入圈子").click()
        expect(second_page.locator("body")).to_contain_text("已加入圈子")
        expect(second_page.locator("body")).to_contain_text("团团")

        page.goto(page.url)
        expect(page.locator("body")).to_contain_text("圈圈")
        expect(page.locator("body")).to_contain_text("团团")
        page.get_by_label("我的宠物").select_option(label="圈圈")
        page.get_by_label("目标宠物").select_option(label="团团")
        page.get_by_label("互动动作").select_option("visit")
        page.get_by_role("button", name="发起互动").click()

        expect(page.locator("body")).to_contain_text("发起了 拜访")
        expect(page.locator("body")).to_contain_text("最近事件")
    finally:
        second_context.close()


def test_mini_games_modal_flow(page: Page):
    email = unique_email()
    password = "pass123456"

    page.goto(f"{BASE_URL}/register")
    page.get_by_label("邮箱").fill(email)
    page.get_by_label("密码").fill(password)
    page.get_by_label("确认密码").fill(password)
    page.get_by_role("button", name="注册").click()

    page.goto(f"{BASE_URL}/login")
    page.get_by_label("邮箱").fill(email)
    page.get_by_label("密码").fill(password)
    page.get_by_role("button", name="登录").click()

    expect(page).to_have_url(f"{BASE_URL}/dashboard")

    page.get_by_role("link", name="新建宠物").click()
    pet_name = "小游戏测试宠物"
    page.get_by_label("名字").fill(pet_name)
    page.get_by_label("物种").select_option(label="基础宠物")
    page.get_by_label("颜色").select_option(label="粉色")
    page.get_by_label("性格").select_option(label="活泼")
    page.get_by_role("button", name="创建宠物").click()
    page.goto(f"{BASE_URL}/dashboard")

    pet_card = page.locator("[data-pet-card]").first
    expect(pet_card).to_be_visible()
    initial_coins_text = pet_card.locator(".wallet-current-value").inner_text()
    initial_coins = int(initial_coins_text.strip())

    pet_card.get_by_role("link", name="海滩防线").click()
    expect(page).to_have_url(re.compile(r"/pets/\d+/mini-games/shooting"))

    page.locator("[data-shooting-difficulty]").select_option("easy")
    weapon_select = page.locator("[data-shooting-weapon]")
    expect(weapon_select).to_be_visible()
    weapon_select.select_option("machine_gun")
    expect(page.locator("[data-battle-weapon-pill]")).to_contain_text("重机枪")

    page.get_by_role("button", name="开始防守").click()
    field = page.locator("[data-battle-stage]")
    expect(field).to_be_visible()
    box = field.bounding_box()
    assert box is not None

    sweep_positions = [0.22, 0.38, 0.52, 0.68, 0.8, 0.6, 0.44, 0.3]
    for pos in sweep_positions:
        page.mouse.move(box["x"] + box["width"] * pos, box["y"] + box["height"] * 0.56)
        for _ in range(3):
            field.click(position={"x": box["width"] * pos, "y": box["height"] * 0.56})
            page.wait_for_timeout(260)

    expect(page.locator("[data-battle-result]")).to_contain_text("结算完成", timeout=26000)

    page.get_by_role("link", name="返回控制台").click()
    expect(page).to_have_url(re.compile(r"/dashboard"))

    total_coins = int(page.locator(".dashboard-total-coins").inner_text().strip())
    assert total_coins > initial_coins

    coin_log_first = page.locator("#dashboard-coin-log-list li").first
    expect(coin_log_first).to_contain_text("mini_game")
    expect(coin_log_first).to_contain_text(pet_name)


def test_voxel_fps_page_loads_from_dashboard(page: Page):
    email = unique_email()
    password = "pass123456"

    page.goto(f"{BASE_URL}/register")
    page.get_by_label("邮箱").fill(email)
    page.get_by_label("密码").fill(password)
    page.get_by_label("确认密码").fill(password)
    page.get_by_role("button", name="注册").click()

    page.goto(f"{BASE_URL}/login")
    page.get_by_label("邮箱").fill(email)
    page.get_by_label("密码").fill(password)
    page.get_by_role("button", name="登录").click()
    expect(page).to_have_url(f"{BASE_URL}/dashboard")

    page.get_by_role("link", name="新建宠物").click()
    page.get_by_label("名字").fill("方块战场测试宠物")
    page.get_by_label("物种").select_option(label="基础宠物")
    page.get_by_label("颜色").select_option(label="粉色")
    page.get_by_label("性格").select_option(label="活泼")
    page.get_by_role("button", name="创建宠物").click()

    page.goto(f"{BASE_URL}/dashboard")
    page.locator("[data-pet-card]").first.get_by_role("link", name="方块 FPS").click()
    expect(page).to_have_url(f"{FPS_BASE_URL}/")
    page.get_by_label("昵称").fill("方块战场测试玩家")
    page.get_by_role("button", name="进入方块战场").click()
    expect(page).to_have_url(f"{FPS_BASE_URL}/play")
    expect(page.get_by_role("heading", name="方块战场")).to_be_visible()
    expect(page.get_by_role("heading", name="选择作战模式")).to_be_visible()
    expect(page.get_by_role("button", name="单机模式")).to_be_visible()
    expect(page.get_by_role("button", name="联机模式")).to_be_visible()


def test_voxel_fps_multiplayer_lobby_flow(page: Page, browser: Browser):
    password = "pass123456"

    def register_and_open_voxel(target_page: Page, email: str, pet_name: str):
        target_page.goto(f"{BASE_URL}/register")
        target_page.get_by_label("邮箱").fill(email)
        target_page.get_by_label("密码").fill(password)
        target_page.get_by_label("确认密码").fill(password)
        target_page.get_by_role("button", name="注册").click()
        expect(target_page).to_have_url(f"{BASE_URL}/dashboard")
        target_page.get_by_role("link", name="新建宠物").click()
        target_page.get_by_label("名字").fill(pet_name)
        target_page.get_by_label("物种").select_option(label="基础宠物")
        target_page.get_by_label("颜色").select_option(label="粉色")
        target_page.get_by_label("性格").select_option(label="活泼")
        target_page.get_by_role("button", name="创建宠物").click()
        target_page.goto(f"{BASE_URL}/dashboard")
        target_page.locator("[data-pet-card]").first.get_by_role("link", name="方块 FPS").click()
        expect(target_page).to_have_url(f"{FPS_BASE_URL}/")
        target_page.get_by_label("昵称").fill(pet_name)
        target_page.get_by_role("button", name="进入方块战场").click()
        expect(target_page).to_have_url(f"{FPS_BASE_URL}/play")

    second_context = browser.new_context()
    second_page = second_context.new_page()
    try:
        register_and_open_voxel(page, unique_email(), "hostpet")
        register_and_open_voxel(second_page, unique_email(), "guestpet")

        page.get_by_role("button", name="联机模式").click()
        expect(page.get_by_role("heading", name="选择房间或创建新房")).to_be_visible()
        page.get_by_role("button", name="创建房间").click()
        expect(page.locator("[data-voxel-lobby-room-code]")).not_to_have_text("-")
        room_code = page.locator("[data-voxel-lobby-room-code]").inner_text().strip()
        page.locator('button.slot-toggle[data-slot-toggle="red"][data-slot-index="1"][data-slot-closed="true"]').click()
        expect(page.locator("[data-voxel-team-red]")).to_contain_text("该位置已关闭")

        second_page.get_by_role("button", name="联机模式").click()
        second_page.locator(f'button[data-room-join="{room_code}"]').click()
        expect(second_page.locator("[data-voxel-lobby-room-code]")).to_have_text(room_code)
        expect(page.locator("[data-voxel-team-blue]")).to_contain_text("guestpet")
        expect(second_page.locator("[data-voxel-team-red]")).to_contain_text("hostpet")
        expect(second_page.locator("[data-voxel-team-red]")).to_contain_text("已关闭")

        page.get_by_role("button", name="房主开始对局").click()
        expect(page.locator("[data-voxel-overlay]")).to_be_hidden()
        expect(second_page.locator("[data-voxel-overlay]")).to_be_hidden()

        second_page.keyboard.press("Escape")
        expect(second_page.locator("[data-voxel-pause]")).to_be_visible()
        second_page.get_by_role("button", name="离开房间").click()
        expect(second_page.get_by_role("heading", name="选择房间或创建新房")).to_be_visible()
    finally:
        second_context.close()


def test_shop_items_are_usable_on_pet_detail(page: Page):
    email = unique_email()
    password = "pass123456"

    page.goto(f"{BASE_URL}/register")
    page.get_by_label("邮箱").fill(email)
    page.get_by_label("密码").fill(password)
    page.get_by_label("确认密码").fill(password)
    page.get_by_role("button", name="注册").click()

    page.goto(f"{BASE_URL}/login")
    page.get_by_label("邮箱").fill(email)
    page.get_by_label("密码").fill(password)
    page.get_by_role("button", name="登录").click()

    expect(page).to_have_url(f"{BASE_URL}/dashboard")

    page.get_by_role("link", name="新建宠物").click()
    pet_name = "商店道具测试宠物"
    page.get_by_label("名字").fill(pet_name)
    page.get_by_label("物种").select_option(label="基础宠物")
    page.get_by_label("颜色").select_option(label="粉色")
    page.get_by_label("性格").select_option(label="活泼")
    page.get_by_role("button", name="创建宠物").click()

    for _ in range(6):
        page.get_by_role("button", name="玩耍").click()

    page.goto(f"{BASE_URL}/shop")
    cards = page.locator(".pet-card")
    food_name = None
    medicine_name = None
    current_coins = 56
    for idx in range(cards.count()):
        card = cards.nth(idx)
        category = card.locator("p").nth(2).inner_text().strip() if card.locator("p").count() > 2 else ""
        title = card.locator("h2").inner_text().strip()
        price_text = card.locator("p").nth(1).inner_text().strip() if card.locator("p").count() > 1 else ""
        price = int(price_text.replace("价格：", "").replace(" 金币", "") or 0)
        if "分类：食物" in category and food_name is None:
            if price > current_coins:
                continue
            card.get_by_role("button", name="购买").click()
            food_name = title
            current_coins -= price
            page.goto(f"{BASE_URL}/shop")
            cards = page.locator(".pet-card")
            continue
        if "分类：治疗" in category and medicine_name is None:
            if price > current_coins:
                continue
            if "治疗恢复" not in card.inner_text():
                continue
            card.get_by_role("button", name="购买").click()
            medicine_name = title
            current_coins -= price
            page.goto(f"{BASE_URL}/shop")
            cards = page.locator(".pet-card")
        if food_name and medicine_name:
            break

    assert food_name is not None
    assert medicine_name is not None

    page.goto(f"{BASE_URL}/dashboard")
    page.get_by_role("link", name="查看详情").click()
    expect(page.locator("body")).to_contain_text(pet_name)

    food_card = page.locator("form[action$='/feed'] .feed-choice-card", has_text=food_name).first
    expect(food_card).to_contain_text(food_name)
    food_card.click()
    page.locator("form[action$='/feed']").get_by_role("button", name="喂食").click()
    expect(page.locator("body")).to_contain_text("已喂食")

    medicine_card = page.locator("form[action$='/heal'] .feed-choice-card", has_text=medicine_name).first
    expect(medicine_card).to_contain_text(medicine_name)


def test_energy_pill_is_used_from_sleep_action(page: Page):
    email = unique_email()
    password = "pass123456"

    page.goto(f"{BASE_URL}/register")
    page.get_by_label("邮箱").fill(email)
    page.get_by_label("密码").fill(password)
    page.get_by_label("确认密码").fill(password)
    page.get_by_role("button", name="注册").click()

    page.goto(f"{BASE_URL}/login")
    page.get_by_label("邮箱").fill(email)
    page.get_by_label("密码").fill(password)
    page.get_by_role("button", name="登录").click()

    page.get_by_role("link", name="新建宠物").click()
    page.get_by_label("名字").fill("精力丸入口测试宠物")
    page.get_by_label("物种").select_option(label="基础宠物")
    page.get_by_label("颜色").select_option(label="粉色")
    page.get_by_label("性格").select_option(label="活泼")
    page.get_by_role("button", name="创建宠物").click()

    for _ in range(6):
        page.get_by_role("button", name="玩耍").click()

    page.goto(f"{BASE_URL}/shop")
    found = False
    for idx in range(page.locator(".pet-card").count()):
        card = page.locator(".pet-card").nth(idx)
        if card.locator("h2").inner_text().strip() == "精力丸":
            card.get_by_role("button", name="购买").click()
            found = True
            break
    assert found

    page.goto(f"{BASE_URL}/dashboard")
    pet_card = page.locator("[data-pet-card]").first
    expect(pet_card.locator(".inventory-quick-strip")).to_contain_text("精力丸 1")
    pet_card.get_by_role("button", name="睡觉").click()
    expect(pet_card.locator("[id^='panel-sleep-']").first).to_be_visible()
    energy_card = pet_card.locator("form[action$='/sleep'] .feed-choice-card", has_text="精力丸").first
    expect(energy_card).to_contain_text("精力 +5")
    energy_card.click()
    pet_card.locator("form[action$='/sleep']").get_by_role("button", name="确认恢复").click()
    expect(page.locator("body")).to_contain_text("已使用 精力丸")
