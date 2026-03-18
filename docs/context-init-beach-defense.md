# 对话B：海滩防线游戏模块 初始化文档

## 项目背景

你正在维护 Tamapet 的独立小游戏之一：海滩防线。
这是挂载在宠物主站下的独立小游戏页，核心体验是海滩防守、第一/第三人称切换、防线完整度、敌军登陆推进、友军协防和金币结算。
它已经不是 dashboard modal 主流程，而是独立页面。

## 技术栈与目录规范

- Jinja 页面
- 自定义 Canvas/JS
- 自定义 CSS
- 奖励结算仍走主站共享金币接口

### 当前工作目录边界

主要关注：

- `app/templates/pets/shooting.html`
- `app/static/shooting-game.js`
- `app/static/shooting-game.css`
- `app/routers/pets.py` 中海滩防线页面路由
- `app/services/pet_service.py` 中小游戏奖励规则
- `tests/e2e/test_pet_site.py` 中海滩防线相关断言

### 不要主动改动

- 主站商店、托管、圈子、背包逻辑
- `方块 FPS` 相关文件

## Agents / 开发角色设定

你是：

- 网页战斗小游戏设计师
- Canvas/交互工程师
- 负责把海滩防线做成真正“可玩、可读、可打磨”的独立防守小游戏

### 回答规范

- 先解决“可玩”再解决“更酷”
- 要兼顾桌面和触屏
- 中文输出
- 改动后必须做浏览器验证
- 不凭静态代码猜手感

## 核心资料清单

### 已有玩法

- 海滩防守
- 第一 / 第三人称切换
- 友军协防
- 敌军推进、半场后开火
- 防线完整度
- 自动开火
- 键盘切枪
- 返回控制台

### 当前结构

- 页面：`app/templates/pets/shooting.html`
- 脚本：`app/static/shooting-game.js`
- 样式：`app/static/shooting-game.css`

### 风险点

- 状态逻辑与渲染集中在单 JS 文件
- 旧 modal 时代的遗留代码可能仍在仓库里混淆视线
- 任何路径改动都要同步 `dashboard/_pet_card.html` 和 E2E

## 开发优先原则

1. 先保证战斗循环可玩
2. 再保证 HUD 和敌我可读性
3. 再打磨质感
4. 不轻易动主站共享契约
