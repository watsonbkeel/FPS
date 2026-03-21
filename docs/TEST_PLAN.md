# 自动化测试方案

本文档定义 **方块 FPS 独立站** 的测试目标、分层和验收标准。

## 1. 测试目标

必须覆盖以下核心闭环：
1. 首页可访问
2. 输入昵称后可以进入 `/play`
3. 单机模式能开始并完成结算
4. 联机房间可创建、加入、开局、离房
5. 健康检查正常
6. 关键移动端兼容逻辑不回退
7. 死亡/复活、暂停、全屏、MVP 结算稳定

## 2. 测试分层

### 2.1 Smoke test
- `GET /health`
- `GET /`
- `GET /play` 未登录时重定向

### 2.2 单元与集成测试
重点覆盖：
- 昵称会话
- 房间创建/加入/开局/claim
- 重定向行为
- iPad 触屏兼容回归
- MVP 结算回归

### 2.3 浏览器回归
重点覆盖：
- 首页输入昵称
- 进入 `/play`
- 房间大厅流程
- Overlay 按钮点击
- 全屏与暂停

## 3. 推荐命令

```bash
pytest tests/unit -q
pytest tests/unit/test_fps_standalone.py -q
pytest tests/unit/test_voxel_fps_ipad_touch_regression.py -q
pytest tests/unit/test_voxel_fps_mvp_regression.py -q
```
