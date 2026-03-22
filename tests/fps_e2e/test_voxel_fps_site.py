from __future__ import annotations

import os
from playwright.sync_api import Browser, Page, expect

FPS_BASE_URL = os.getenv("FPS_BASE_URL", "http://127.0.0.1:18428")


def enter_game(page: Page, nickname: str) -> None:
    page.goto(f"{FPS_BASE_URL}/")
    expect(page.get_by_role("heading", name="直接填昵称，马上开打")).to_be_visible()
    page.get_by_label("昵称").fill(nickname)
    page.get_by_role("button", name="进入方块战场").click()
    expect(page).to_have_url(f"{FPS_BASE_URL}/play")
    expect(page.get_by_role("heading", name="方块战场")).to_be_visible()


def test_standalone_fps_homepage_and_entry(page: Page):
    enter_game(page, "StormFox")
    expect(page.get_by_role("button", name="单机模式")).to_be_visible()
    expect(page.get_by_role("button", name="联机模式")).to_be_visible()


def test_standalone_fps_multiplayer_lobby_flow(page: Page, browser: Browser):
    second_context = browser.new_context()
    second_page = second_context.new_page()
    try:
        enter_game(page, "HostFox")
        enter_game(second_page, "GuestWolf")

        page.get_by_role("button", name="联机模式").click()
        expect(page.get_by_role("heading", name="选择房间或创建新房")).to_be_visible()
        page.get_by_role("button", name="创建房间").click()
        expect(page.locator("[data-voxel-lobby-room-code]")).not_to_have_text("-")
        room_code = page.locator("[data-voxel-lobby-room-code]").inner_text().strip()

        second_page.get_by_role("button", name="联机模式").click()
        second_page.locator(f'button[data-room-join="{room_code}"]').click()
        expect(second_page.locator("[data-voxel-lobby-room-code]")).to_have_text(room_code)
        expect(page.locator("[data-voxel-team-blue]")).to_contain_text("GuestWolf")
        expect(second_page.locator("[data-voxel-team-red]")).to_contain_text("HostFox")

        page.get_by_role("button", name="房主开始对局").click()
        expect(page.locator("[data-voxel-overlay]")).to_be_hidden()
        expect(second_page.locator("[data-voxel-overlay]")).to_be_hidden()
    finally:
        second_context.close()
