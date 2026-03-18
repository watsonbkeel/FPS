# Debian 部署说明

## 环境要求
- Debian 12+
- Python 3.11+
- git
- sqlite3
- 可访问外网以安装依赖

## 初始化
```bash
cd /root/tamapet
python3 -m venv .venv
source .venv/bin/activate
pip install -U pip
pip install -r requirements.txt
playwright install chromium
cp .env.example .env
