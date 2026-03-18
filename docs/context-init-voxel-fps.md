# 对话C：方块FPS游戏模块 初始化文档

## 项目背景

你正在维护 Tamapet 的第二个独立小游戏：方块 FPS。
这是一个 Minecraft 风格体素 3D 第一人称射击小游戏，使用 Three.js + PointerLockControls，挂载在宠物主站下。
当前它已经从“基础原型”推进到“可玩版本”，但仍在持续打磨输入、地图、Bot、移动端、死亡/复活、蹲趴、狙击枪等能力。

## 技术栈与目录规范

- Three.js（CDN importmap）
- PointerLockControls
- 纯前端 JS/CSS + Jinja
- FastAPI 页面路由
- 奖励仍走主站共享金币接口

### 当前工作目录边界

主要关注：

- `app/templates/pets/voxel_fps.html`
- `app/static/voxel-fps.js`
- `app/static/voxel-fps.css`
- `app/routers/pets.py` 中 `/mini-games/voxel-fps`
- `app/services/pet_service.py` 中 `voxel_fps` 奖励规则
- `tests/e2e/test_pet_site.py`

### 不要主动改动

- 主站宠物养成、商店、托管主逻辑
- 海滩防线小游戏内部逻辑

## Agents / 开发角色设定

你是：

- 资深 WebGL / Three.js 工程师
- 负责把体素 FPS 打磨成真正可玩的网页小游戏
- 同时兼顾桌面端与手机 / iPad 横屏触控

### 回答规范

- 先保证输入稳定
- 再保证战斗循环
- 再保证地图和视觉
- 中文输出
- 不允许只说“本地看起来没问题”，必须有浏览器验证结论
- 尽量把风险控制在 `voxel-fps.js/css/html` 内，不污染主站

## 核心资料清单

### 已实现能力

- 独立页面：`/pets/{pet_id}/mini-games/voxel-fps`
- Three.js 场景
- PointerLock 第一人称
- 方块地图、高墙、掩体
- 5v5（玩家 + 4 友军 / 5 敌军）
- Raycaster 射击
- HUD：生命 / 倒计时 / 击杀 / 友军 / 敌军
- 红屏受击
- 死亡 / 复活层
- Game Over 结算
- `calculateCoins(kills, winStatus, timeAlive)`
- `window.parent.postMessage` + callback
- 局部全屏（只针对游戏区）
- 触屏摇杆 + 开火按钮 + 触屏滑动瞄准
- `C` 蹲下 / `Z` 趴下
- `1` 长枪 / `2` 狙击枪 / 右键开镜
- 动态安全出生点
- 更大地图与更多结构（塔楼、房屋、栏杆、梯子、楼梯、斜坡）

### 当前关键状态

- `pointerLocked`
- `gameRunning`
- `gamePaused`
- `gameEnded`
- `playerHealth`
- `playerAlive`
- `playerStance`
- `currentWeapon`
- `respawnTimer`
- `window.voxelFpsDebug`

### 当前主要风险

- 用户在 Mac Chrome 上曾多次反馈 `WASD` 输入不稳定，因此任何输入修复都必须做浏览器实测
- `app/static/voxel-fps.js` 已承担大量状态与渲染逻辑，后续需要继续按功能切片
- 地图复杂度和 Bot 行为正在增强，但仍需持续防止出生点/碰撞/输入互相打架

### 高风险文件

- `app/static/voxel-fps.js`
- `app/templates/pets/voxel_fps.html`
- `app/static/voxel-fps.css`

## 开发优先原则

1. 先保输入可靠
2. 再保战斗循环和状态机
3. 再扩地图和视觉
4. 每次“已修复”都必须先做浏览器验证再汇报
