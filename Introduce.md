# 方块 FPS 项目介绍

## 项目概述

这是一个可独立部署的网页方块风格 FPS 项目。

项目目标很明确：
- 用浏览器直接进入游戏
- 支持单机 5v5 战斗
- 支持联机房间与实时同步
- 支持手机 / iPad 触屏操作
- 支持独立端口和公网访问

当前公开交付形态是 **Standalone FPS 网站**，玩家进入首页后输入昵称即可开始游戏。

---

## 核心体验

### 1. 单机战斗
- 玩家进入战场后与友军 Bot 协同作战
- 红蓝两队在固定时间内比拼击杀数
- 支持死亡、复活、暂停、再来一局

### 2. 联机房间
- 创建房间
- 加入房间
- 切换队伍和槽位
- 房主开局
- WebSocket 房间同步
- 局内结算与全场 MVP 展示

### 3. 输入与平台适配
- 桌面端：键鼠第一人称射击
- 移动端：虚拟摇杆、开火、跳跃、蹲下、切枪、全屏
- iPad Safari：额外兼容桌面模式下的触屏检测与按钮点击

### 4. 战斗特性
- Three.js 场景渲染
- Pointer Lock 第一人称视角
- 多种武器：长枪、狙击枪、手雷、指挥旗
- 方块地图、掩体、楼梯、梯子、坡道
- Bot 行为、复活、队伍指挥

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | Python / FastAPI |
| 模板 | Jinja2 |
| 前端 | 原生 JS / CSS |
| 3D | Three.js + PointerLockControls |
| 实时同步 | WebSocket |
| 测试 | pytest + Playwright |
| 部署 | Debian + systemd + venv |

---

## 关键代码入口

- `app/fps_main.py`：独立站 FastAPI 入口
- `app/routers/fps_site.py`：昵称入口、页面路由、房间 API、WebSocket
- `app/services/fps_identity_service.py`：昵称会话
- `app/services/mini_games/voxel_rooms.py`：联机房间状态
- `app/static/voxel-fps.js`：核心游戏逻辑
- `app/static/voxel-fps.css`：战斗场景样式
- `app/static/fps-standalone.css`：独立站视觉层
- `app/templates/fps/game.html`：游戏页
- `app/templates/fps/landing.html`：昵称入口页

---

## 当前工程重点

1. 输入稳定性
2. 联机房间可靠性
3. iPad / 移动端兼容性
4. `voxel-fps.js` 模块化拆分
5. 独立部署和公网入口稳定性

---

## 当前已知边界

- 联机房间仍是内存实现
- 房主仍承担部分权威状态同步
- 重启服务后房间不会保留
- 大部分前端状态还集中在 `app/static/voxel-fps.js`

---

## 启动方式

```bash
cd /path/to/project
python3 -m venv .venv
source .venv/bin/activate
pip install -U pip
pip install -r requirements.txt
./scripts/run_fps.sh
```

默认入口：`http://127.0.0.1:18428`
