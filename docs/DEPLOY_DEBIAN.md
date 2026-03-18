# Debian 部署说明

本文档规定了 Tamapet 宠物平台在 Debian 系统的标准部署流程。
所有后端配置、环境路径与依赖安装需严格遵守此说明。

## 1. 基础环境要求
- Debian 12 或更高版本
- Python 3.11+
- git、sqlite3
- 可访问外网以安装 pip 依赖

## 2. 项目初始化
默认项目路径为 `/root/tamapet`。

```bash
cd /root/tamapet
python3 -m venv .venv
source .venv/bin/activate
pip install -U pip
pip install -r requirements.txt
playwright install chromium
