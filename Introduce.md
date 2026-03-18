# Tamapet 项目介绍

## 项目概述

**Tamapet** 是一个「网页版拓麻歌子 / 线上电子宠物平台」的 MVP（最小可行产品）。

该项目重现了经典拓麻歌子（Tamagotchi）的核心玩法，并增加了轻社交元素：用户可以创建宠物、照顾宠物、开启托管，并让宠物在圈子内与其他玩家的宠物进行异步互动。

### 产品定位

- **核心玩法**：养成、成长、关系、代际、轻社交、异步事件
- **目标用户**：怀旧玩家、休闲游戏爱好者、喜欢轻松社交的用户
- **产品形态**：网页应用，无需下载安装，跨平台访问

---

## 技术栈

| 层级 | 技术选型 |
|------|----------|
| 后端 | Python 3.11+ / FastAPI |
| ORM | SQLAlchemy |
| 数据库 | SQLite（MVP 阶段） |
| 前端 | Jinja2 模板 + HTMX + 轻量 CSS/JS |
| 测试 | pytest + Playwright (Chromium) |
| 部署 | Debian + python venv + systemd |

### 技术约束

- **不使用**：Docker、Redis、Celery、PostgreSQL（除非明确要求）
- **服务端口**：默认 `0.0.0.0:18427`
- **代码规范**：所有页面文案、README、注释使用中文
- **安全**：密码哈希、表单含 CSRF token，敏感配置放 `.env`

---

## 核心功能模块

### 1. 用户系统

- 用户注册（邮箱 + 密码）
- 用户登录/退出
- Session 管理

### 2. 宠物系统

#### 基础属性（0~100）

| 属性 | 说明 |
|------|------|
| hunger | 饥饿值，越高越饿 |
| mood | 心情值，越高越开心 |
| cleanliness | 清洁度，越高越干净 |
| health | 健康值，越高越健康 |
| energy | 精力值，越高越有精神 |

#### 生命周期阶段

```
egg → baby → child → teen → adult
```

- **egg**：宠物蛋阶段
- **baby**：幼年期
- **child**：童年期
- **teen**：青少年期
- **adult**：成年期（可繁殖）

#### 基础照顾动作

| 动作 | 效果 |
|------|------|
| 喂食 | hunger 降低，mood 小幅提升 |
| 玩耍 | mood 提升，energy 降低，获得少量 coins |
| 清理 | cleanliness 提升，mood 小幅提升 |
| 睡觉 | energy 恢复（饥饿过高时效果变差） |
| 治病 | health 恢复（消耗 coins 或药品） |

### 3. 时间推进系统

- 基于 `last_tick_at` 字段，按小时补算状态
- 补算规则必须**幂等**（同一时间窗口重复调用结果一致）
- 每次打开页面或执行关键动作时自动触发

### 4. 托管系统

| 托管模式 | 说明 |
|----------|------|
| 保命托管 | 仅在健康风险较高时做最低限度干预，避免死亡 |
| 生活托管 | 自动维持较平稳状态，按预设阈值自动喂食、清洁、睡觉、用药 |
| 社交托管 | 继承生活托管，自动参与圈子互动，有冷却时间防止刷分 |

### 5. 圈子社交系统

- 用户可以创建或加入圈子
- 圈子内展示宠物列表、关系、最近事件
- 互动仅允许**结构化动作**，不开放文字聊天

#### 异步互动动作

| 动作 | 效果 |
|------|------|
| 拜访 | 提高心情和少量关系 |
| 送礼 | 消耗物品，提高关系 |
| 一起玩 | 提高双方 mood 和关系 |
| 结伴任务 | 给 coins、关系和随机事件 |
| 圈子活动 | 系统定期生成 |

#### 冷却规则

- 同一对宠物同类互动有冷却时间
- 同一宠物每日互动次数有限制
- 防止无限刷关系和 coins

### 6. 代际系统

- 只有 **adult** 阶段才可繁殖
- 需要关系值达到阈值
- 下一代继承部分颜色倾向、性格倾向和少量属性加成
- 家谱页显示：自己、父母、子代

### 7. 经济系统

#### 获得 coins 途径

- 日常照顾
- 小游戏
- 圈子活动
- 托管完成事件

#### 消费 coins 途径

- 食物
- 药品
- 礼物
- 装扮

### 8. 商店系统

- 固定商品（MVP 阶段）
- 背包库存管理

### 9. 控制台交互与小游戏

- 控制台内直接喂食/玩耍/清理/睡觉/治病，HTMX 就地刷新，保持当前滚动位置
- 黄蛋、绿蛋等宠物在展示区有挥手、伸懒腰、走来走去、做鬼脸等循环动作与徽章提示
- 金币钱包与账本在控制台展示，最近一笔变动与实时累积可见
- “小游戏”单入口，大弹窗内三款手动操作的游戏：打拳击、战术靶场射击（人形移动靶 + 武器可选）、接金币；支持难度选择并结算金币

---

## 目录结构

```
/root/tamapet/
├── app/
│   ├── main.py              # FastAPI 应用入口
│   ├── config.py            # 配置管理
│   ├── db.py                # 数据库连接
│   ├── constants.py         # 常量定义
│   ├── models/
│   │   └── entities.py      # SQLAlchemy 模型
│   ├── schemas/
│   │   └── forms.py         # Pydantic 数据校验
│   ├── routers/
│   │   ├── auth.py
│   │   ├── pages.py
│   │   ├── pets.py
│   │   ├── circles.py
│   │   └── shop.py
│   ├── services/
│   │   ├── auth_service.py
│   │   ├── pet_service.py
│   │   ├── tick_service.py
│   │   ├── hosting_service.py
│   │   ├── circle_service.py
│   │   ├── event_service.py
│   │   ├── shop_service.py
│   │   ├── seed_service.py
│   │   └── dashboard_service.py
│   ├── templates/           # Jinja2 模板（含 dashboard/ 控制台与小游戏弹窗）
│   ├── static/              # CSS/JS（dashboard.js 含动作与小游戏逻辑）
│   ├── jobs/
│   └── utils/
│
├── tests/
│   ├── unit/
│   │   ├── test_tick_service.py
│   │   ├── test_hosting_service.py
│   │   ├── test_circle_logic.py
│   │   └── test_breed_logic.py
│   └── e2e/
│       └── test_pet_site.py
│
├── scripts/
│   ├── bootstrap.sh
│   ├── init_db.py
│   ├── seed_demo.py
│   └── run_e2e.sh
│
├── docs/
│   ├── PRODUCT_RULES.md
│   ├── TEST_PLAN.md
│   └── DEPLOY_DEBIAN.md
│
├── deploy/tamapet.service
├── .env.example
├── requirements.txt
└── README.md
```

---

## 快速启动

### 1. 环境准备

```bash
cd /root/tamapet

# 创建虚拟环境
python3 -m venv .venv

# 激活虚拟环境
source .venv/bin/activate

# 安装依赖
pip install -U pip
pip install -r requirements.txt

# 安装 Playwright 浏览器
playwright install chromium
```

### 2. 配置环境变量与初始化数据库

1) 复制并编辑 `.env.example` 为 `.env`，关键项：
   - `SECRET_KEY`：改成随机长字符串
   - `DATABASE_URL`：默认为 `sqlite:///./tamapet.db`
   - `BASE_URL`、`HOST`、`PORT`：默认 `0.0.0.0:18427`
   - `SEED_DEMO`：`true` 时导入演示账号/宠物/圈子/商品

2) 初始化数据库：
```bash
python scripts/init_db.py
```

> 若修改了 `.env`，重新执行 init 以应用；种子数据仅在 `SEED_DEMO=true` 时导入。

### 3. 启动服务

```bash
uvicorn app.main:app --host 0.0.0.0 --port 18427
```

### 4. 访问应用

- 本机访问：`http://127.0.0.1:18427`
- 局域网访问：`http://<你的服务器IP>:18427`

### 5. 一键启动脚本

```bash
./scripts/bootstrap.sh
```

脚本会自动完成：创建虚拟环境、安装依赖、安装 Playwright、复制 `.env.example`、初始化数据库与种子（依赖 `SEED_DEMO`）。

---

## 测试

### 单元测试

```bash
pytest tests/unit -q
```

### E2E 测试

```bash
pytest tests/e2e -q
```

> 需已安装 Playwright Chromium；流程覆盖注册、登录、创建宠物、照顾、托管、圈子互动、小游戏与账本刷新。

### E2E 验证脚本

```bash
./scripts/run_e2e.sh
```

---

## 默认种子数据

当 `.env` 中 `SEED_DEMO=true` 时，初始化会创建：

| 类型 | 内容 |
|------|------|
| 演示用户 | `demo@tamapet.local` |
| 演示密码 | `pass123456` |
| 演示宠物 | 阿团 |
| 默认圈子 | 新手圈 |
| 商店商品 | 小饼干、简易药剂、小花束 |

> 种子数据在 `.env` 设 `SEED_DEMO=true` 且重新运行 `scripts/init_db.py` 后导入。

---

## 健康检查

```bash
curl http://127.0.0.1:18427/health
```

预期返回：

```json
{"status":"ok","service":"tamapet"}
```

---

## 部署（Debian）

### 步骤 1：初始化环境

```bash
cd /root/tamapet
python3 -m venv .venv
source .venv/bin/activate
pip install -U pip
pip install -r requirements.txt
playwright install chromium
python scripts/init_db.py
```

### 步骤 2：配置 systemd 服务

```bash
cp deploy/tamapet.service /etc/systemd/system/tamapet.service
systemctl daemon-reload
systemctl enable tamapet
systemctl restart tamapet
systemctl status tamapet
```

### 步骤 3：验证

```bash
curl http://127.0.0.1:18427/health
```

---

## 主要页面路由

| 路由 | 说明 |
|------|------|
| `/` | 首页 |
| `/register` | 注册页 |
| `/login` | 登录页 |
| `/dashboard` | 用户控制台 |
| `/pets/new` | 创建宠物 |
| `/pets/{id}` | 宠物详情 |
| `/pets/{id}/hosting` | 托管设置 |
| `/pets/{id}/family` | 家谱页面 |
| `/shop` | 商店 |
| `/circles` | 圈子列表 |
| `/circles/{id}` | 圈子详情 |
| `/health` | 健康检查 |

---

## 代码架构原则

1. **路由层**（routers/）：只处理请求/响应，不写重业务逻辑
2. **业务逻辑层**（services/）：放置核心业务逻辑
3. **数据校验层**（schemas/）：使用 Pydantic 进行数据校验
4. **模型层**（models/）：SQLAlchemy 模型定义
5. **幂等性**：所有状态推进和补算必须幂等
6. **前端交互**：控制台 HTMX 交互需保持就地反馈与滚动位置；小游戏需手动操作后结算金币

---

## 后续开发指南

### 当前已完成（MVP）

- 用户系统（注册/登录/退出）
- 宠物创建与照顾
- 时间推进系统
- 三种托管模式
- 圈子社交
- 简化代际
- 商店系统
- 事件日志
- 控制台就地交互、防自动滚动、金币钱包与账本
- 小游戏弹窗（三款：拳击 / 战术靶场射击（可选武器） / 接金币，含难度选择与金币结算）
- 黄蛋/绿蛋等宠物的循环动作与徽章提示
- 测试覆盖（pytest 单测 + Playwright E2E）

### 暂未实现（可扩展方向）

- 自由聊天功能
- 用户上传图片
- 开放交易市场
- 复杂基因算法
- WebSocket 实时系统
- 管理后台复杂权限系统

### 已知限制与注意事项

- 仅提供 SQLite，本地文件默认 `./tamapet.db`，未提供迁移/备份脚本
- 不使用 Docker/Redis/Celery/PostgreSQL，端口固定 18427（可在 `.env` 调整）
- 需先下载 Playwright Chromium 才能跑 E2E；E2E 会创建/使用种子数据
- `.env` 必改 `SECRET_KEY`；`SEED_DEMO=true` 才会导入演示账号与宠物
- 部署示例基于 systemd，默认工作目录 `/root/tamapet`

---

## 相关文档

- [产品规则](./docs/PRODUCT_RULES.md) - 详细的产品设计规则
- [测试方案](./docs/TEST_PLAN.md) - 自动化测试方案
- [部署说明](./docs/DEPLOY_DEBIAN.md) - Debian 系统部署指南
