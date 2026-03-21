# DECISIONS

## D001 - Standalone FPS 先在同仓库内独立运行

方块 FPS 先不拆到新仓库，而是在当前仓库中增加独立 FastAPI 入口：`app.fps_main`。

原因：

- 可以复用现有 `voxel-fps.js/css`、房间服务和模板资源
- 风险明显小于直接跨仓库迁移
- 允许主站版和 standalone 版并行存在，便于平滑切换

## D002 - Standalone FPS 使用昵称会话，不再要求注册登录

独立版通过 session 保存：

- `fps_nickname`
- `fps_user_id`

原因：

- 启动游戏链路更短
- 满足“直接访问独立端口就能进入游戏”的目标
- 不把宠物、金币、账号体系继续耦合进 standalone 入口

## D003 - Standalone FPS 暂不接主站金币结算

独立版保留本地结算展示，但不写入主站宠物金币。

原因：

- 独立站已经不再依赖宠物身份
- 避免为了金币同步继续绑定主站用户模型和数据库流程

## D004 - 主站版 voxel-fps 先保留

当前不删除主站中的 `/pets/{pet_id}/mini-games/voxel-fps`。

原因：

- 降低回归风险
- 允许独立站逐步验证上线
- 后续可以根据真实流量再决定是否完全迁移
