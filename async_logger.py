# async_logger.py
import threading
import queue
import time
from datetime import datetime
from pathlib import Path
import atexit

# ========== 配置 ==========
LOG_DIR = Path(__file__).parent / "logs"
LOG_DIR.mkdir(exist_ok=True)
LOG_FILE = LOG_DIR / "default.log"
today = datetime.now().strftime("%Y-%m-%d")
LOG_FILE = LOG_DIR / f"agent_{today}.log"

# ========== 日志队列 ==========
_log_queue = queue.Queue()
_stop_event = threading.Event()


def _worker():
    """后台线程：从队列取日志并写入文件"""
    while not _stop_event.is_set():
        try:
            # 等待最多 1 秒，然后批量处理
            entries = []
            try:
                entry = _log_queue.get(timeout=1)
                entries.append(entry)
                # 尽可能多地收集日志
                while True:
                    try:
                        entries.append(_log_queue.get_nowait())
                    except queue.Empty:
                        break
            except queue.Empty:
                continue
            
            if entries:
                with open(LOG_FILE, 'a', encoding='utf-8') as f:
                    for entry in entries:
                        f.write(entry + '\n')
        except Exception as e:
            # 写入失败不影响主流程
            # print(f"⚠️ 日志写入异常: {e}")
            pass


def _flush():
    """程序退出时，确保所有日志写入"""
    while not _log_queue.empty():
        time.sleep(0.1)


# ========== 启动后台线程 ==========
_thread = threading.Thread(target=_worker, daemon=True)
_thread.start()

# 注册退出时清理
atexit.register(_flush)


def log_async(message: str, level: str = "INFO"):
    """异步写入日志"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    entry = f"[{timestamp}] [{level}] {message}"
    _log_queue.put(entry)


def log_info(message: str):
    log_async(message, "INFO")


def log_warning(message: str):
    log_async(message, "WARNING")


def log_error(message: str):
    log_async(message, "ERROR")