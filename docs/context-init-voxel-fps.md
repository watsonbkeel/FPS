# 方块 FPS 模块初始化文档

## 当前定位

你正在维护一个可独立部署的网页方块 FPS 项目。

当前公开入口是：
- `app/fps_main.py`
- 首页 `/`
- 游戏页 `/play`

玩家通过昵称进入，不依赖账号体系。

## 技术边界

- Three.js（CDN importmap）
- PointerLockControls
- 原生 JS / CSS
- Jinja 模板
- FastAPI + WebSocket

## 主要工作区

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

## 当前能力

- 单机模式
- 联机房间
- WebSocket 同步
- 移动端控件
- iPad 兼容性修复
- 死亡 / 复活 / 暂停 / 全屏
- 结算 / MVP / 个人评分

## 当前风险

- `app/static/voxel-fps.js` 体量大
- 房间是内存实现
- 联机状态一致性需要持续回归测试

## 开发优先级

1. 输入稳定性
2. 联机同步正确性
3. 触屏 / iPad 兼容性
4. 前端模块化拆分
