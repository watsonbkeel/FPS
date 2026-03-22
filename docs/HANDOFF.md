# HANDOFF

## 项目定位

本仓库当前对外公开定位为 **方块 FPS 独立站**。

玩家流程：
1. 打开首页
2. 输入昵称
3. 进入 `/play`
4. 选择单机或联机

## 关键入口

- FastAPI 入口：`app/fps_main.py`
- 默认端口：`18428`
- 健康检查：`/health`
- 房间接口：`/api/rooms`
- WebSocket：`/api/rooms/{room_id}/ws`

## 关键文件

- `app/fps_main.py`
- `app/routers/fps_site.py`
- `app/services/fps_identity_service.py`
- `app/services/mini_games/voxel_rooms.py`
- `app/static/voxel-fps.js`
- `app/static/voxel-fps.css`
- `app/static/fps-standalone.css`
- `app/templates/fps/base.html`
- `app/templates/fps/landing.html`
- `app/templates/fps/game.html`
- `deploy/voxel-fps.service`
- `scripts/bootstrap_fps.sh`
- `scripts/run_fps.sh`
- `scripts/run_fps_e2e.sh`
- `tests/fps_unit/`
- `tests/fps_e2e/`

## 当前状态

- Standalone 首页可用
- 昵称会话可用
- 单机模式可玩
- 联机房间可创建 / 加入 / 开局 / 结算
- iPad 触屏检测、Overlay 点击、全屏按钮点击已做兼容
- 死亡后复活不会再因自动 pointer lock 导致渲染冻结

## 已知边界

- 房间是内存状态
- 多实例共享房间尚未实现
- `app/static/voxel-fps.js` 仍是高复杂度文件
- 联机正确性仍建议继续靠回归测试保护

## 接手建议

1. 后续优先继续拆分 `app/static/voxel-fps.js`
2. 继续增强联机状态一致性测试
3. 真机验证 iPad Safari 与 Android Chrome
4. 如需横向扩容，再评估房间持久化方案
