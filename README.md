# Tamapet

Tamapet 是一个“网页版拓麻歌子 / 线上电子宠物平台”MVP。  
当前版本已经围绕最小闭环实现了注册登录、创建宠物、照顾、托管、圈子互动、商店、事件日志与简化代际系统。

仓库当前同时包含一个可独立运行的 **Standalone 方块 FPS 站点**：

- 主站：`uvicorn app.main:app --port 18427`
- FPS 独立站：`uvicorn app.fps_main:app --port 18428`

主站里的“方块 FPS”按钮现在只作为跳转入口，默认会跳到 `FPS_PUBLIC_BASE_URL` 对应的独立站地址；方块 FPS 也不再给主站宠物结算金币。

## 当前进度

- [x] 目录结构与 SQLite 数据模型
- [x] 注册 / 登录 / 退出
- [x] 控制台、宠物详情、托管设置、家谱、商店、圈子页面
- [x] 宠物喂食、玩耍、清理、睡觉、治病
- [x] 基于 `last_tick_at` 的按小时状态推进
- [x] 保命托管、生活托管、社交托管
- [x] 圈子创建、加入、结构化互动
- [x] 简化代际系统与家谱展示
- [x] 固定商品与背包库存
- [x] 主站与小游戏奖励/页面入口边界整理（外部 URL 保持不变）
- [x] `pytest` 单测 + Playwright E2E
- [x] Debian `systemd` 部署文件

## 技术栈

- Python 3.11
- FastAPI
- SQLAlchemy
- SQLite
- Jinja2 + HTMX
- pytest + Playwright
- Debian + venv + systemd

## 主要页面

- `/`
- `/register`
- `/login`
- `/dashboard`
- `/pets/new`
- `/pets/{id}`
- `/pets/{id}/hosting`
- `/pets/{id}/family`
- `/shop`
- `/circles`
- `/circles/{id}`
- `/health`

## 目录结构

```text
app/
  main.py
  fps_main.py
  config.py
  db.py
  constants.py
  models/
  schemas/
  routers/
    mini_games.py
  services/
    mini_games/
  templates/
  static/
  jobs/
  utils/

tests/
  e2e/
    test_pet_site.py
  unit/
    test_tick_service.py
    test_hosting_service.py
    test_circle_logic.py
    test_breed_logic.py

scripts/
  bootstrap.sh
  init_db.py
  seed_demo.py
  run_e2e.sh
  run_fps.sh
```

## 本地启动

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -U pip
pip install -r requirements.txt
playwright install chromium
python scripts/init_db.py
uvicorn app.main:app --host 0.0.0.0 --port 18427
```

访问地址：

- 本机：`http://127.0.0.1:18427`
- 局域网：`http://<你的服务器IP>:18427`

独立 FPS 站点：

- 本机：`http://127.0.0.1:18428`
- 局域网：`http://<你的服务器IP>:18428`

如果你已经通过 FRPC 暴露公网地址，记得把 `.env` 中的 `FPS_PUBLIC_BASE_URL` 配成你的公网入口，这样主站按钮会直接跳到稳定外网地址。

## 一键初始化

```bash
./scripts/bootstrap.sh
```

脚本会完成：

- 创建 `.venv`
- 安装依赖
- 安装 Playwright Chromium
- 复制 `.env.example` 为 `.env`
- 初始化数据库和种子数据

## 测试命令

单元测试：

```bash
pytest tests/unit -q
```

E2E 测试：

```bash
pytest tests/e2e -q
```

完整 E2E 验证脚本：

```bash
./scripts/run_e2e.sh
```

## Standalone FPS 本地启动

独立版方块 FPS 不依赖主站注册登录，只要求玩家先输入昵称再进入战场。

```bash
source .venv/bin/activate
./scripts/run_fps.sh
```

也可以直接运行：

```bash
source .venv/bin/activate
uvicorn app.fps_main:app --host 0.0.0.0 --port 18428
```

独立站主要路径：

- `/`
- `/play`
- `/api/rooms`
- `/health`

## 默认种子数据

当 `.env` 中 `SEED_DEMO=true` 时，初始化会创建：

- 演示用户：`demo@tamapet.local`
- 演示密码：`pass123456`
- 演示宠物：`阿团`
- 默认圈子：`新手圈`
- 固定商店商品：`小饼干`、`简易药剂`、`小花束`

## Debian 部署

1. 初始化环境

```bash
cd /root/tamapet
python3 -m venv .venv
source .venv/bin/activate
pip install -U pip
pip install -r requirements.txt
playwright install chromium
python scripts/init_db.py
```

2. 启动测试服务

```bash
uvicorn app.main:app --host 0.0.0.0 --port 18427
```

3. 安装 systemd 服务

```bash
cp deploy/tamapet.service /etc/systemd/system/tamapet.service
systemctl daemon-reload
systemctl enable tamapet
systemctl restart tamapet
systemctl status tamapet
```

4. 安装 Standalone FPS systemd 服务

```bash
cp deploy/tamapet-fps.service /etc/systemd/system/tamapet-fps.service
systemctl daemon-reload
systemctl enable tamapet-fps
systemctl restart tamapet-fps
systemctl status tamapet-fps
```

## 健康检查

```bash
curl http://127.0.0.1:18427/health
```

预期返回：

```json
{"status":"ok","service":"tamapet"}
```
