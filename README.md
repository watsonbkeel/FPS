# 方块 FPS

这是一个可独立部署的网页方块风格 FPS 项目。

当前公开定位就是 **Standalone Voxel FPS**：
- 直接访问独立站地址进入游戏
- 不需要注册登录，只需输入昵称
- 支持单机 5v5、联机房间、移动端/iPad 触控
- 支持独立端口部署与 FRP / 公网转发

## 当前能力

- 单机模式：玩家 + 友军 Bot vs 敌军 Bot
- 联机模式：创建房间、加入房间、换队、关槽、开局、房间内同步
- 昵称会话：无需账号体系
- 移动端控件：摇杆、开火、跳跃、蹲下、武器切换、全屏
- iPad Safari 兼容：触屏判定、Overlay 按钮点击、全屏按钮触摸
- 游戏结算：展示战斗结果与个人评分，不绑定站外经济系统

## 技术栈

- Python 3.11+
- FastAPI
- Jinja2 模板
- Three.js + PointerLockControls
- WebSocket
- pytest + Playwright
- Debian + venv + systemd

## 关键入口

- 应用入口：`app/fps_main.py`
- 默认端口：`18428`
- 主页：`/`
- 游戏页：`/play`
- 房间 API：`/api/rooms`
- 健康检查：`/health`

## 目录结构

```text
app/
  fps_main.py
  routers/
    fps_site.py
  services/
    fps_identity_service.py
    mini_games/
      voxel_rooms.py
  static/
    voxel-fps.js
    voxel-fps.css
    fps-standalone.css
    style.css
  templates/
    fps/
      base.html
      landing.html
      game.html

deploy/
  voxel-fps.service

scripts/
  bootstrap_fps.sh
  run_fps.sh
  run_fps_e2e.sh

tests/
  fps_unit/
    test_voxel_fps_standalone.py
    test_voxel_fps_ipad_touch_regression.py
    test_voxel_fps_mvp_regression.py
    test_voxel_fps_standalone_contract.py
  fps_e2e/
    test_voxel_fps_site.py
```

## 本地启动

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -U pip
pip install -r requirements.txt
./scripts/bootstrap_fps.sh
./scripts/run_fps.sh
```

或直接运行：

```bash
source .venv/bin/activate
uvicorn app.fps_main:app --host 0.0.0.0 --port 18428
```

访问：
- 本机：`http://127.0.0.1:18428`
- 局域网：`http://<你的服务器IP>:18428`

如果你通过 FRP / FRPC 暴露公网地址，请把 `.env` 中的 `FPS_PUBLIC_BASE_URL` 配成外网入口，例如：

```env
FPS_PUBLIC_BASE_URL=http://bkeel.com:5871
```

## 环境变量

常用配置：
- `FPS_PORT`：独立站端口，默认 `18428`
- `FPS_PUBLIC_BASE_URL`：公开访问地址，用于页面中生成外部入口
- `FPS_SESSION_COOKIE_NAME`：昵称会话 cookie 名称
- `SECRET_KEY`：会话签名密钥

## 测试

运行核心单测：

```bash
pytest tests/fps_unit/test_voxel_fps_standalone.py -q
pytest tests/fps_unit/test_voxel_fps_ipad_touch_regression.py -q
pytest tests/fps_unit/test_voxel_fps_mvp_regression.py -q
```

运行所有 FPS 单测：

```bash
pytest tests/fps_unit -q
```

运行 FPS E2E：

```bash
./scripts/run_fps_e2e.sh
```

## 部署

部署说明见：
- `DEPLOY_DEBIAN.md`
- `docs/DEPLOY_DEBIAN.md`
- `docs/HANDOFF.md`

## 当前已知边界

- 联机房间当前仍是进程内内存状态
- 不适合多实例共享房间
- 进程重启后房间会丢失
- `app/static/voxel-fps.js` 仍然是项目里最重的单文件，后续适合继续模块化切分
