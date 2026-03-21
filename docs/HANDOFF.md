# HANDOFF

## 项目当前定位

本仓库当前不是独立 FPS 仓库，而是：

- Tamapet 宠物主站
- 海滩防线小游戏
- 方块 FPS 小游戏
- Standalone 方块 FPS 独立站

其中 Standalone FPS 已支持单独端口部署，使用昵称会话进入，不再依赖主站注册登录。
主站中的“方块 FPS”按钮现在仅作为跳转入口，目标地址由 `FPS_PUBLIC_BASE_URL` 决定。

## 关键入口

主站入口：

- `app.main:app`
- 默认端口：`18427`

Standalone FPS 入口：

- `app.fps_main:app`
- 默认端口：`18428`

## 关键文件

- `app/main.py`：Tamapet 主站 FastAPI 入口
- `app/fps_main.py`：Standalone FPS FastAPI 入口
- `app/routers/mini_games.py`：主站小游戏入口、主站版 voxel-fps 房间 API
- `app/routers/fps_site.py`：独立站昵称入口、独立站房间 API、独立站 WS
- `app/services/mini_games/voxel_rooms.py`：联机房间状态与广播逻辑
- `app/services/fps_identity_service.py`：Standalone FPS 昵称会话
- `app/static/voxel-fps.js`：主站版与独立版共用 FPS 核心逻辑
- `app/templates/pets/voxel_fps.html`：主站版 FPS 页面
- `app/templates/fps/game.html`：独立版 FPS 页面
- `app/templates/fps/landing.html`：独立版昵称入口页
- `deploy/tamapet.service`：主站 systemd
- `deploy/tamapet-fps.service`：独立版 FPS systemd

## 当前状态

- 主站功能保持可用
- 主站 E2E 回归通过
- Standalone FPS 已支持：
  - 昵称输入
  - `/play` 直接进游戏
  - 单机模式
  - 联机房间创建 / 加入 / 换队 / 关槽 / 开局 / WebSocket
  - 独立结算展示
- 独立版不再写入主站宠物金币
- 主站旧 voxel-fps 路由会直接跳转到独立站首页

## 已知边界

- `voxel_room_service` 仍是进程内内存房间
- 不适合多实例共享房间
- 进程重启后房间会丢失
- `app/static/voxel-fps.js` 仍是高风险大文件

## 本地启动

主站：

```bash
source .venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 18427
```

Standalone FPS：

```bash
source .venv/bin/activate
./scripts/run_fps.sh
```

## 交接建议

1. 后续继续做 FPS 功能时，优先在 `app.fps_main` 入口下验证独立站体验
2. 不要直接大拆 `app/static/voxel-fps.js`，先按小边界抽 helper
3. 若要继续强化联机，优先补测试，再评估房间持久化
4. 优先处理 git remote 中的敏感凭据风险
