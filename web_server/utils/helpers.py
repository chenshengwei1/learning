# web_server/utils/helpers.py
import re
import uuid
import sqlite3
from datetime import datetime
from pathlib import Path

from web_server.config import BASE_DIR, DB_PATH


def generate_session_name(message: str) -> str:
    """根据用户第一条消息生成会话名称"""
    cleaned = re.sub(r'\s+', ' ', message).strip()
    
    if len(cleaned) <= 30:
        name = cleaned
    else:
        truncated = cleaned[:30]
        if ' ' in truncated:
            last_space = truncated.rfind(' ')
            if last_space > 10:
                truncated = truncated[:last_space]
        name = truncated + "..."
    
    if len(name) < 2 or not re.search(r'[\w\u4e00-\u9fff]', name):
        name = "新对话"
    
    return name


def generate_session_id() -> str:
    """生成新的会话ID"""
    return uuid.uuid4().hex[:12]


def get_current_timestamp() -> str:
    """获取当前时间戳字符串"""
    return datetime.now().isoformat()


def save_session_metadata_to_db(session_id: str, name: str) -> None:
    """保存会话名称到数据库"""
    try:
        conn = sqlite3.connect(str(DB_PATH))
        cursor = conn.cursor()
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS session_metadata (
                thread_id TEXT PRIMARY KEY,
                name TEXT DEFAULT '新对话',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        cursor.execute("""
            INSERT INTO session_metadata (thread_id, name, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(thread_id) DO UPDATE SET 
                name = excluded.name,
                updated_at = CURRENT_TIMESTAMP
        """, (session_id, name))
        
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"⚠️ 保存会话名称失败: {e}")


def init_session_metadata_table() -> None:
    """初始化会话元数据表"""
    try:
        conn = sqlite3.connect(str(DB_PATH))
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS session_metadata (
                thread_id TEXT PRIMARY KEY,
                name TEXT DEFAULT '新对话',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()
        conn.close()
        print("✅ 会话元数据表初始化成功")
    except Exception as e:
        print(f"⚠️ 初始化会话元数据表失败: {e}")


def load_existing_sessions_to_dict(sessions: dict):
    """从 SQLite 加载已有会话到 sessions 字典"""
    if not DB_PATH.exists():
        return
    
    try:
        import sqlite3
        conn = sqlite3.connect(str(DB_PATH))
        cursor = conn.cursor()
        cursor.execute("SELECT DISTINCT thread_id FROM checkpoints")
        thread_ids = [row[0] for row in cursor.fetchall()]
        
        print(f"已加载 {len(thread_ids)} 个会话")

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS session_metadata (
                thread_id TEXT PRIMARY KEY,
                name TEXT DEFAULT '新对话',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        cursor.execute("SELECT thread_id, name FROM session_metadata")
        metadata = {row[0]: row[1] for row in cursor.fetchall()}
        
        print(f"📂 已加载 {len(thread_ids)} 个会话，{len(metadata)} 个有名称")
        
        from agent_core import create_agent
        
        for tid in thread_ids:
            if tid not in sessions:
                print(f"加载会话 {tid}")
                session_name = metadata.get(tid, f"会话 {tid[:8]}")
                sessions[tid] = {
                    "agent": create_agent(),
                    "config": {"configurable": {"thread_id": tid}},
                    "created_at": datetime.now(),
                    "messages": [],
                    "name": session_name,
                    "message_count": 0
                }
        
        cursor.close()
        conn.close()
    except Exception:
        pass