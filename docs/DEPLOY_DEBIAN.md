# Debian 部署说明

本文档定义 **方块 FPS 独立站** 在 Debian 上的标准部署流程。

## 基础环境
- Debian 12+
- Python 3.11+
- git
- 可访问外网安装依赖

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

## 必要配置

```env
SECRET_KEY=change-me
FPS_PORT=18428
FPS_PUBLIC_BASE_URL=http://bkeel.com:5871
FPS_SESSION_COOKIE_NAME=voxel_fps_session
```

## 本地启动验证

```bash
./scripts/run_fps.sh
curl http://127.0.0.1:18428/health
```

## systemd

```bash
cp deploy/voxel-fps.service /etc/systemd/system/voxel-fps.service
systemctl daemon-reload
systemctl enable voxel-fps
systemctl restart voxel-fps
systemctl status voxel-fps --no-pager
```

## FRPC

如果通过 FRPC 暴露公网地址，确认有一个代理把远端端口转发到本机 `18428`。

```toml
[[proxies]]
name = "FPS"
type = "tcp"
localIP = "127.0.0.1"
localPort = 18428
remotePort = 5871
```
