# Debian 部署说明

本文档描述 **方块 FPS 独立站** 在 Debian 上的标准部署方式。

## 环境要求
- Debian 12+
- Python 3.11+
- git
- 可访问外网以安装依赖

## 初始化

```bash
cd /path/to/project
python3 -m venv .venv
source .venv/bin/activate
pip install -U pip
pip install -r requirements.txt
cp .env.example .env
./scripts/bootstrap_fps.sh
```

## 关键环境变量

至少确认：

```env
SECRET_KEY=change-me
FPS_PORT=18428
FPS_PUBLIC_BASE_URL=http://bkeel.com:5871
FPS_SESSION_COOKIE_NAME=voxel_fps_session
```

## 启动测试

```bash
source .venv/bin/activate
./scripts/run_fps.sh
```

本机验证：

```bash
curl http://127.0.0.1:18428/health
```

## 安装 systemd 服务

```bash
cp deploy/voxel-fps.service /etc/systemd/system/voxel-fps.service
systemctl daemon-reload
systemctl enable voxel-fps
systemctl restart voxel-fps
systemctl status voxel-fps --no-pager
```

## FRPC 场景

如果你使用 FRPC 暴露公网入口，需要让远端端口转发到本机 `18428`。

示例：

```toml
[[proxies]]
name = "FPS"
type = "tcp"
localIP = "127.0.0.1"
localPort = 18428
remotePort = 5871
```

部署完成后可以验证：

```bash
curl http://127.0.0.1:18428/health
curl http://bkeel.com:5871/health
```
