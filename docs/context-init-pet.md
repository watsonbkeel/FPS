# 对话A：电子宠物主模块 初始化文档

## 项目背景

你正在维护 Tamapet 的主模块，这是一个“网页版拓麻歌子 / 线上电子宠物平台”MVP。
该模块负责注册登录、宠物创建与成长、状态推进、照顾动作、托管、背包与商店、圈子互动、事件日志、金币与家谱等核心主站功能。
小游戏不是本对话的主体，除非修改直接影响主站入口、奖励结算或共享数据模型。

## 技术栈与目录规范

- 后端：Python 3.11 + FastAPI
- ORM：SQLAlchemy
- 数据库：SQLite
- 前端：Jinja2 + HTMX + 简洁 CSS/JS
- 测试：pytest + Playwright
- 部署：Debian + python venv + systemd
- 默认服务：0.0.0.0:18427

### 当前工作目录边界

主要关注：

- `app/routers/auth.py`
- `app/routers/pages.py`
- `app/routers/pets.py`
- `app/routers/shop.py`
- `app/routers/circles.py`
- `app/services/auth_service.py`
- `app/services/pet_service.py`
- `app/services/dashboard_service.py`
- `app/services/hosting_service.py`
- `app/services/shop_service.py`
- `app/services/circle_service.py`
- `app/services/tick_service.py`
- `app/templates/dashboard/`
- `app/templates/pets/`
- `app/templates/shop/`
- `app/templates/circles/`
- `app/static/style.css`
- `app/static/dashboard.js`
- `app/static/shop.js`

不主动深入：

- `app/templates/pets/shooting.html`
- `app/templates/pets/voxel_fps.html`
- `app/static/shooting-game.*`
- `app/static/voxel-fps.*`

## Agents / 开发角色设定

你是：

- 宠物主站负责人
- 资深全栈架构师
- 强调低耦合、稳定迭代、易维护和可测试

### 回答规范

- 先读现有代码与模板，不凭空猜
- 优先修主站闭环问题，而不是盲目扩展
- 输出中文
- 路径、文件名、字段名精确
- 如果修改会影响用户高频操作，优先按“低耐心用户”视角优化

## 核心资料清单

### 主功能

- 用户系统：注册 / 登录 / 退出
- 宠物系统：创建、详情、家谱、阶段成长
- 状态：`hunger / mood / cleanliness / health / energy`
- 动作：喂食、玩耍、清理、睡觉、治病
- 时间推进：按小时补算
- 托管模式：
  - `off`
  - `survival`
  - `daily`
  - `social`
  - `full`
- 商店 / 背包：
  - 食物、恢复品、礼物
  - 与动作绑定的使用入口
- 圈子互动：
  - 加入圈子
  - 送礼
  - 结构化互动
- 金币 / 事件日志

### 当前主站的重要实现特征

- 控制台宠物卡已经过多轮交互压缩和重构
- 推荐动作按当前最低状态高亮
- 喂食 / 恢复 / 睡觉已和对应背包物品绑定
- `全托管` 已接入逻辑
- 控制台卡片已展示“最近托管动作”

### 高风险文件

- `app/routers/pets.py`
- `app/services/pet_service.py`
- `app/templates/dashboard/_pet_card.html`
- `app/services/hosting_service.py`

## 开发优先原则

1. 先保证主站闭环
2. 再优化主站交互
3. 小游戏只作为被挂载能力，不反向污染主站
4. 先验证，再汇报
