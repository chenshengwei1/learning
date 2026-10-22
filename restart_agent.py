# restart_agent.py
"""智能体自重启工具"""
import os
import sys
import time
import subprocess
from pathlib import Path

def restart_web_server():
    agent_dir = Path(__file__).resolve().parent
    
    print("🔄 正在重启 Web 服务...")
    print("   旧进程即将关闭，新进程将在 2 秒后启动")
    print()
    
    if sys.platform == "win32":
        subprocess.Popen(
            [sys.executable, str(agent_dir / "web_server.py")],
            cwd=str(agent_dir),
            creationflags=subprocess.CREATE_NEW_CONSOLE
        )
    else:
        subprocess.Popen(
            [sys.executable, str(agent_dir / "web_server.py")],
            cwd=str(agent_dir),
            start_new_session=True
        )
    
    time.sleep(2)
    print("✅ 新进程已启动，旧进程退出")
    os._exit(0)

if __name__ == "__main__":
    restart_web_server()