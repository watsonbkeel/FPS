# AGENTS

本仓库当前对外公开定位为一个 **可独立部署的方块 FPS 网站**。

## 项目目标

实现一个支持以下能力的浏览器 FPS：
- 输入昵称后直接进入游戏
- 单机 5v5 战斗
- 联机房间创建、加入、开局与同步
- 移动端 / iPad 触屏操作
- 独立端口部署与公网访问

## 关键技术

- FastAPI
- Jinja2
- Three.js + PointerLockControls
- WebSocket
- pytest + Playwright
- Debian + systemd

## 主要代码区域

- `app/fps_main.py`
- `app/routers/fps_site.py`
- `app/services/fps_identity_service.py`
- `app/services/mini_games/voxel_rooms.py`
- `app/static/voxel-fps.js`
- `app/static/voxel-fps.css`
- `app/static/fps-standalone.css`
- `app/templates/fps/landing.html`
- `app/templates/fps/game.html`
- `deploy/voxel-fps.service`

## 开发原则

1. 优先保证输入可靠
2. 优先保证战斗循环稳定
3. 优先保证联机房间状态正确
4. 移动端与 iPad 兼容问题必须做真实交互验证
5. 对 `app/static/voxel-fps.js` 的改动尽量小步推进，并补回归测试

## 常用验证

```bash
pytest tests/unit -q
./scripts/run_fps.sh
curl http://127.0.0.1:18428/health
```
