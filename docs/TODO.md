# TODO

## P0

- [ ] 清理 git remote 中的敏感凭据，并在仓库外完成令牌轮换
- [ ] 将 `docs/HANDOFF.md` 纳入正式跟踪或重建为正式交接文档
- [ ] 补 Standalone FPS 的真实浏览器联机回归测试

## P1

- [ ] 为 `app/routers/fps_site.py` 增补多人开始、离房、重复 claim 的边界测试
- [ ] 为 `app/static/voxel-fps.js` 抽出更小的 standalone / 主站共享边界
- [ ] 在部署文档中明确独立 FPS 与主站是两个独立进程

## P2

- [ ] 评估是否保留主站内 `/pets/{id}/mini-games/voxel-fps` 入口长期共存
- [ ] 评估 Standalone FPS 是否需要独立房间持久化
- [ ] 评估移动端真机专项测试计划
