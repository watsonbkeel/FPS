# Tamapet 模块化重构指南

本文档用于指导 Tamapet 项目的模块化拆分。目标不是立刻把项目拆成多个独立仓库，而是在**保持当前主站可运行、可测试、可部署**的前提下，把“电子宠物主模块”“海滩防线”“方块 FPS”三个部分的代码边界拉清楚，降低后续维护时的上下文负担。

---

## 1. 当前项目的实际模块边界

### 1.1 电子宠物主模块

主要职责：

- 用户注册 / 登录 / 退出
- 宠物创建、详情、照顾、成长、家谱
- 时间推进、状态补算
- 托管模式
- 商店、背包、物品消费
- 圈子、送礼、异步互动
- 金币流水、事件日志

当前主要文件：

- `app/routers/auth.py`
- `app/routers/pages.py`
- `app/routers/pets.py`
- `app/routers/shop.py`
- `app/routers/circles.py`
- `app/services/auth_service.py`
- `app/services/pet_service.py`
- `app/services/dashboard_service.py`
- `app/services/hosting_service.py`
- `app/services/shop_service.py`
- `app/services/circle_service.py`
- `app/services/tick_service.py`
- `app/templates/dashboard/`
- `app/templates/pets/detail.html`
- `app/templates/pets/hosting.html`
- `app/templates/pets/family.html`
- `app/templates/shop/index.html`
- `app/templates/circles/`
- `app/static/dashboard.js`
- `app/static/shop.js`
- `app/static/assets/`

### 1.2 海滩防线模块

主要职责：

- 独立小游戏页
- 海滩防守战斗循环
- 第一 / 第三人称视角切换
- 敌军推进与友军协防
- 金币结算与返回主站

当前主要文件：

- `app/templates/pets/shooting.html`
- `app/static/shooting-game.js`
- `app/static/shooting-game.css`
- `app/routers/pets.py` 中 `/pets/{pet_id}/mini-games/shooting`
- `app/services/pet_service.py` 中小游戏奖励规则

### 1.3 方块 FPS 模块

主要职责：

- Three.js 体素 FPS 独立页
- PointerLock 第一人称战斗
- 5v5 Bot 对战
- 触屏 / 横屏控制
- 金币结算与返回主站

当前主要文件：

- `app/templates/pets/voxel_fps.html`
- `app/static/voxel-fps.js`
- `app/static/voxel-fps.css`
- `app/routers/pets.py` 中 `/pets/{pet_id}/mini-games/voxel-fps`
- `app/services/pet_service.py` 中小游戏奖励规则

---

## 2. 当前最主要的耦合点

### 2.1 路由耦合

`app/routers/pets.py` 当前既承担宠物主逻辑，又承担两个小游戏页面路由和小游戏结算接口。

### 2.2 服务层耦合

`app/services/pet_service.py` 当前既负责宠物主逻辑，也包含小游戏奖励规则与小游戏结算逻辑。

### 2.3 模板入口耦合

`app/templates/dashboard/_pet_card.html` 是控制台主卡，也是两个小游戏入口所在位置。

### 2.4 基础设施耦合

以下文件是主站和两个小游戏共同依赖的基础层：

- `app/templates/base.html`
- `app/main.py`
- `/static` 挂载
- `Pet.coins`
- `PetEvent`
- `csrf` / session / owner check

---

## 3. 推荐的重构后目录结构

目标：

- 电子宠物逻辑继续保留在主目录
- 主目录下新增两个子目录，分别承载两个小游戏

推荐目录树如下：

```text
app/
  main.py
  config.py
  db.py
  constants.py

  models/
    __init__.py
    entities.py

  schemas/
    __init__.py
    forms.py

  routers/
    __init__.py
    auth.py
    pages.py
    shop.py
    circles.py
    pets.py
    mini_games.py
    games/
      __init__.py
      beach_defense.py
      voxel_fps.py

  services/
    __init__.py
    auth_service.py
    pet_service.py
    tick_service.py
    hosting_service.py
    circle_service.py
    event_service.py
    shop_service.py
    seed_service.py
    dashboard_service.py
    mini_games/
      __init__.py
      rewards.py
      beach_defense_service.py
      voxel_fps_service.py

  templates/
    base.html
    index.html
    auth/
      login.html
      register.html
    dashboard/
      _action_response.html
      _coin_log_section.html
      _pet_card.html
      _wallet_summary.html
    pets/
      detail.html
      family.html
      hosting.html
      new.html
    shop/
      index.html
    circles/
      detail.html
      index.html
    games/
      beach_defense/
        page.html
      voxel_fps/
        page.html

  static/
    style.css
    dashboard.js
    shop.js
    assets/
      pet_berry_pink.svg
      pet_lemon_sprout.svg
      pet_mint_dumpling.svg
      pet_ocean_bobo.svg
    games/
      beach_defense/
        game.css
        game.js
        assets/
      voxel_fps/
        game.css
        game.js
        assets/

tests/
  conftest.py
  e2e/
    test_pet_site.py
    games/
      test_beach_defense.py
      test_voxel_fps.py
  unit/
    test_tick_service.py
    test_hosting_service.py
    test_circle_logic.py
    test_breed_logic.py
    test_item_balance.py
    mini_games/
      test_rewards.py
      test_beach_defense_logic.py
      test_voxel_fps_logic.py
```

---

## 4. 重构原则

### 4.1 先拆目录，不先改外部 URL

建议第一阶段保持以下 URL 不变：

- `/pets/{id}/mini-games/shooting`
- `/pets/{id}/mini-games/voxel-fps`
- `/pets/{id}/mini-games/claim`

这样可以降低以下风险：

- 控制台入口失效
- E2E 测试立即全挂
- 浏览器旧书签失效
- 线上环境因为缓存/旧链接崩掉

### 4.2 先复制，再迁移引用，最后再删旧文件

不要第一步就“移动 + 删除”。

推荐顺序：

1. 创建新目录
2. 复制文件到新位置
3. 修改路由与模板引用到新位置
4. 跑测试
5. 删除旧文件

### 4.3 主站和小游戏共享边界尽量少

小游戏和主站共享的，尽量只保留：

- `pet_id`
- `csrf`
- owner check
- 奖励结算接口
- 返回控制台入口
- 金币 / 事件日志写入

小游戏自己的渲染、状态机、交互逻辑不要继续放在主站主目录里膨胀。

---

## 5. 文件迁移时最容易出问题的引用类型

### 5.1 Python import 路径

#### 重构前

```python
from ..services.pet_service import claim_mini_game_reward
```

#### 重构后

```python
from app.services.mini_games.rewards import claim_mini_game_reward
```

容易出问题的文件类型：

- `routers/*.py`
- `services/*.py`
- 未来新增的 `routers/games/*.py`

---

### 5.2 TemplateResponse 模板路径

#### 重构前

```python
return request.app.state.templates.TemplateResponse(
    "pets/shooting.html",
    context,
)
```

#### 重构后

```python
return request.app.state.templates.TemplateResponse(
    "games/beach_defense/page.html",
    context,
)
```

重点检查文件：

- `app/routers/pets.py`
- 未来的 `app/routers/games/*.py`

---

### 5.3 静态资源 URL

#### 重构前

```html
<link rel="stylesheet" href="{{ url_for('static', path='shooting-game.css') }}">
<script type="module" src="{{ url_for('static', path='shooting-game.js') }}"></script>
```

#### 重构后

```html
<link rel="stylesheet" href="{{ url_for('static', path='games/beach_defense/game.css') }}">
<script type="module" src="{{ url_for('static', path='games/beach_defense/game.js') }}"></script>
```

同理，`voxel-fps` 也要改成：

```html
<link rel="stylesheet" href="{{ url_for('static', path='games/voxel_fps/game.css') }}?v=20260313-voxel-fps-3">
<script type="module" src="{{ url_for('static', path='games/voxel_fps/game.js') }}?v=20260313-voxel-fps-3"></script>
```

重点检查文件：

- `app/templates/pets/shooting.html`
- `app/templates/pets/voxel_fps.html`

---

### 5.4 模板里的 href / form action / data-url

#### 重构前

```html
<a class="game-open-button" href="/pets/{{ pet.id }}/mini-games/shooting">海滩防线</a>
<a class="game-open-button secondary" href="/pets/{{ pet.id }}/mini-games/voxel-fps">方块 FPS</a>
```

#### 如果未来改路由后

```html
<a class="game-open-button" href="/games/beach-defense/{{ pet.id }}">海滩防线</a>
<a class="game-open-button secondary" href="/games/voxel-fps/{{ pet.id }}">方块 FPS</a>
```

另外还要注意：

#### 重构前

```html
data-claim-url="/pets/{{ pet.id }}/mini-games/claim"
```

如果 claim 路由迁移，也必须同步改。

重点检查文件：

- `app/templates/dashboard/_pet_card.html`
- `app/templates/pets/shooting.html`
- `app/templates/pets/voxel_fps.html`

---

### 5.5 JS 中写死的 API 路径和 game_type

#### 重构前

```javascript
fetch(`/pets/${petId}/mini-games/claim`, ...)
form.set('game_type', 'shooting')
form.set('game_type', 'voxel_fps')
```

#### 重构后（如果接口不变，推荐先保持不动）

```javascript
fetch(`/pets/${petId}/mini-games/claim`, ...)
form.set('game_type', 'beach_defense')
form.set('game_type', 'voxel_fps')
```

如果你不想立即改 game_type，建议第一阶段保持：

- `shooting`
- `voxel_fps`

只做目录拆分，不动奖励 ID。

重点检查文件：

- `app/static/dashboard.js`
- `app/static/shooting-game.js`
- `app/static/voxel-fps.js`
- `app/services/pet_service.py`

---

### 5.6 E2E 测试里的路径断言

#### 重构前

```python
expect(page).to_have_url(re.compile(r"/pets/\d+/mini-games/shooting"))
expect(page).to_have_url(re.compile(r"/pets/\d+/mini-games/voxel-fps"))
```

#### 如果改路由后

```python
expect(page).to_have_url(re.compile(r"/games/beach-defense/\d+"))
expect(page).to_have_url(re.compile(r"/games/voxel-fps/\d+"))
```

重点检查文件：

- `tests/e2e/test_pet_site.py`

---

## 6. 当前项目最值得先拆的内容

### 第一优先：小游戏奖励结算抽离

建议新增：

- `app/services/mini_games/rewards.py`

把这些从 `pet_service.py` 里搬过去：

- `MINI_GAME_RULES`
- `MINI_GAME_WEAPONS`
- `claim_mini_game_reward`

原因：

- 这是主站和两个小游戏共同依赖的共享边界
- 不先抽这个，小游戏路由再怎么拆，还是会回头依赖 `pet_service.py`

### 第二优先：小游戏页面路由拆分

建议新增：

- `app/routers/games/beach_defense.py`
- `app/routers/games/voxel_fps.py`

保留 `pets.py` 中 owner check 辅助函数即可，但页面入口不要继续都塞在 `pets.py` 里。

### 第三优先：静态资源物理归类

建议迁移：

- `shooting-game.js/css` -> `static/games/beach_defense/`
- `voxel-fps.js/css` -> `static/games/voxel_fps/`

---

## 7. 建议的迁移顺序（最稳版本）

### 阶段 1：建立新目录并复制文件

- 创建：
  - `app/routers/games/`
  - `app/services/mini_games/`
  - `app/templates/games/beach_defense/`
  - `app/templates/games/voxel_fps/`
  - `app/static/games/beach_defense/`
  - `app/static/games/voxel_fps/`

### 阶段 2：先迁海滩防线

原因：

- 海滩防线比方块 FPS 轻量
- 没有 Three.js / importmap / PointerLock / 触屏摇杆这些复杂状态

### 阶段 3：再迁方块 FPS

### 阶段 4：抽小游戏共享 reward

### 阶段 5：拆测试

- `tests/e2e/games/test_beach_defense.py`
- `tests/e2e/games/test_voxel_fps.py`

### 阶段 6：清理遗留代码

特别注意：

- `app/templates/dashboard/_game_modal.html`
- `app/static/dashboard.js` 里旧小游戏残留逻辑
- `style.css` 里旧 modal 相关样式

这些要么迁走，要么标注为废弃，避免继续混淆边界。

---

## 8. 三条迁移建议（很关键）

### 建议 A：第一阶段不要改对外 URL

先保持：

- `/pets/{id}/mini-games/shooting`
- `/pets/{id}/mini-games/voxel-fps`

内部可以已经迁到：

- `routers/games/`
- `templates/games/`
- `static/games/`

### 建议 B：静态资源一定加版本号

这个项目已经多次出现 live 服务和浏览器缓存问题。小游戏静态资源迁移后，建议继续保留版本号，例如：

```html
{{ url_for('static', path='games/voxel_fps/game.js') }}?v=20260313-voxel-fps-3
```

### 建议 C：迁移过程中每一步都跑测试

最少要跑：

```bash
pytest tests/e2e -q
pytest tests/unit -q
```

---

## 9. 建议产物

如果你后续真的准备开 3 个独立对话长期维护，建议在仓库里长期保留：

- `docs/REFACTOR_GUIDE.md`
- `docs/context-init-pet.md`
- `docs/context-init-beach-defense.md`
- `docs/context-init-voxel-fps.md`

这样后面接手的人或 AI 都不会重新从聊天记录里“猜上下文”。

---

## 10. 一句话结论

最稳的拆法不是“现在就把小游戏完全剥成独立 app”，而是：

- 保持主站为宿主
- 先把两个小游戏整理成主站下的独立子模块
- 共享边界只保留奖励、CSRF、owner check 和返回控制台
- 先迁海滩防线，再迁方块 FPS，再删遗留代码
