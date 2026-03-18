# Tamapet

Tamapet 是一个“网页版拓麻歌子 / 线上电子宠物平台”MVP。  
当前版本已经围绕最小闭环实现了注册登录、创建宠物、照顾、托管、圈子互动、商店、事件日志与简化代际系统。

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

## 健康检查

```bash
curl http://127.0.0.1:18427/health
```

预期返回：

```json
{"status":"ok","service":"tamapet"}
```
