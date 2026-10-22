# web_server/config.py
import os
import sys
import io
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# ============ 路径配置 ============
BASE_DIR = Path(__file__).resolve().parent.parent
TEMPLATES_DIR = BASE_DIR / "templates"
CONFIG_PATH = "config/main_graph.yaml"

# ============ 环境设置 ============
os.environ["PYTHONUNBUFFERED"] = "1"
os.environ["PYTHONIOENCODING"] = "utf-8"

if sys.platform == "win32":
    try:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace', line_buffering=True)
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace', line_buffering=True)
    except Exception:
        pass

# ============ 常量 ============
DEFAULT_MAX_TOKENS = 1000000
DB_PATH = BASE_DIR / "agent_memory.db"