# 方块 FPS 测试计划

## 测试目标

验证独立 FPS 站点的关键体验是否可用，而不是只验证接口返回 200。

## 核心范围

- 首页可访问
- 输入昵称后可进入 `/play`
- 单机模式可开始、结束并展示结算
- 联机房间可创建、加入、开局、离开
- iPad / 触屏兼容逻辑不会吞掉关键按钮
- 复活、暂停、全屏、MVP 结算等交互不会卡死

## 推荐命令

```bash
pytest tests/unit -q
pytest tests/unit/test_fps_standalone.py -q
pytest tests/unit/test_voxel_fps_ipad_touch_regression.py -q
pytest tests/unit/test_voxel_fps_mvp_regression.py -q
```

## 重点人工验证

1. 桌面端：死亡后复活，点击画面重新锁定视角
2. iPad Safari：摇杆显示、开始按钮可点、全屏按钮可点
3. 联机：MVP、击杀数、房间状态同步一致
