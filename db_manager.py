# db_manager.py
from datetime import datetime, timezone
import os
import sqlite3
import json
from typing import Optional
from fastapi import APIRouter
from fastapi.responses import HTMLResponse
from pathlib import Path
import pickle

from langgraph.checkpoint.sqlite import SqliteSaver

# 创建路由器
router = APIRouter(prefix="/api/db", tags=["database"])

BASE_DIR = Path(__file__).resolve().parent
TEMPLATES_DIR = BASE_DIR / "templates"
DB_PATH = BASE_DIR / "agent_memory.db"
allowed_tables = ["checkpoints", "writes", "session_metadata"]

import logging

logger = logging.getLogger(__name__)

# ========== 页面路由 ==========

async def db_manager_page():
    """数据库管理页面"""
    html_path = TEMPLATES_DIR / "db_manager.html"
    if not html_path.exists():
        return HTMLResponse(content="<h1>db_manager.html 不存在</h1><p>请创建 templates/db_manager.html</p>")
    with open(html_path, 'r', encoding='utf-8') as f:
        return HTMLResponse(content=f.read())


# ========== API 接口 ==========

async def get_db_tables():
    """获取所有表及其行数和字段信息"""
    if not DB_PATH.exists():
        return {"tables": [], "db_size": 0}
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [row[0] for row in cursor.fetchall()]
    
    result = []
    for table in tables:
        # 获取行数
        cursor.execute(f"SELECT COUNT(*) FROM {table}")
        count = cursor.fetchone()[0]
        
        # 获取字段信息
        cursor.execute(f"PRAGMA table_info({table})")
        columns = cursor.fetchall()
        fields = [
            {
                "name": col[1],
                "type": col[2],
                "not_null": bool(col[3]),
                "default": col[4],
                "primary_key": bool(col[5])
            }
            for col in columns
        ]
        
        result.append({
            "name": table,
            "row_count": count,
            "fields": fields
        })
    
    db_size = DB_PATH.stat().st_size
    conn.close()
    return {"tables": result, "db_size": db_size}


import base64

async def get_table_data(
    table_name: str, 
    page: int = 1, 
    limit: int = 50,
    thread_id: Optional[str] = None
):
    """获取表数据（分页）"""
    try:
        page = int(page)
        limit = int(limit)
        logger.info(f"Fetching data from table {table_name}, page {page}, limit {limit}, thread_id {thread_id}")
        return _safe_get_table_data(table_name, page, limit, thread_id)
    except ValueError:
        return {"error": "无效的分页参数"}
    except Exception as e:
        import traceback
        logger.exception(f"获取表数据时发生异常: {table_name}")
        return {"error": str(e) + traceback.format_exc()}

def _safe_get_table_data(table_name: str, 
        page: int = 1, 
        limit: int = 50,
        thread_id: Optional[str] = None):
    if not DB_PATH.exists():
        return {"data": [], "total": 0, "columns": []}
    
    if table_name not in allowed_tables:
        return {"error": "不允许访问该表"}
    
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute(f"PRAGMA table_info({table_name})")
    columns = [row[1] for row in cursor.fetchall()]
    
    offset = (page - 1) * limit
    sql = f"SELECT * FROM {table_name}"
    params = []
    
    if thread_id:
        sql += " WHERE thread_id = ?"
        params.append(thread_id)
    
    count_sql = f"SELECT COUNT(*) FROM {table_name}"
    if thread_id:
        count_sql += " WHERE thread_id = ?"
    cursor.execute(count_sql, params)
    total = cursor.fetchone()[0]
    
    sql += f" LIMIT ? OFFSET ?"
    cursor.execute(sql, params + [limit, offset])
    rows = cursor.fetchall()
    
    # ✅ 处理 BLOB 字段：转为 Base64 或只显示大小
    data = []
    for row in rows:
        row_dict = dict(row)
        for key, value in row_dict.items():
            if isinstance(value, bytes):
                # BLOB 字段只显示大小，不显示内容（防止解码失败）
                row_dict[key] = decode_blob_to_json(value)
        data.append(row_dict)
    
    conn.close()
    return {"data": data, "total": total, "columns": columns, "page": page, "limit": limit}

def decode_blob_to_json(blob_data: bytes):
    """尝试将 BLOB 反序列化为 JSON"""
    try:
        obj = pickle.loads(blob_data)
        return json.dumps(obj, default=str, ensure_ascii=False)[:500]
    except:
        return f"<无法解码: {len(blob_data)} bytes>"

async def get_db_sessions():
    """获取所有会话及其 checkpoint 数量"""
    if not DB_PATH.exists():
        return {"sessions": []}
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT thread_id, COUNT(*) as checkpoint_count
        FROM checkpoints 
        GROUP BY thread_id
    """)
    rows = cursor.fetchall()
    
    sessions = []
    for row in rows:
        preview = ""
        
        sessions.append({
            "thread_id": row[0],
            "checkpoint_count": row[1],
            "preview": preview
        })
    
    conn.close()
    return {"sessions": sessions}


async def delete_db_session(thread_id: str):
    """删除指定会话的所有数据"""
    if not DB_PATH.exists():
        return {"error": "数据库不存在"}
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 查看有哪些表
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [row[0] for row in cursor.fetchall()]
    
    deleted = 0
    for table in allowed_tables:
        if table in tables:
            cursor.execute(f"DELETE FROM {table} WHERE thread_id = ?", (thread_id,))
            deleted += cursor.rowcount
    
    conn.commit()
    conn.close()
    return {"status": "success", "deleted": deleted, "thread_id": thread_id}


async def vacuum_db():
    """压缩数据库"""
    if not DB_PATH.exists():
        return {"error": "数据库不存在"}
    
    before_size = DB_PATH.stat().st_size
    conn = sqlite3.connect(DB_PATH)
    conn.execute("VACUUM")
    conn.close()
    after_size = DB_PATH.stat().st_size
    
    return {
        "status": "success",
        "before_size": before_size,
        "after_size": after_size,
        "freed": before_size - after_size
    }


async def get_db_size():
    """获取数据库大小"""
    if not DB_PATH.exists():
        return {"size": 0, "size_human": "0 B"}
    
    size = DB_PATH.stat().st_size
    
    if size < 1024:
        size_human = f"{size} B"
    elif size < 1024 * 1024:
        size_human = f"{size / 1024:.2f} KB"
    elif size < 1024 * 1024 * 1024:
        size_human = f"{size / 1024 / 1024:.2f} MB"
    else:
        size_human = f"{size / 1024 / 1024 / 1024:.2f} GB"
    
    return {"size": size, "size_human": size_human}


async def execute_sql(query: dict):
    """执行 SQL 查询（仅 SELECT）"""
    sql = query.get("sql", "")
    
    upper = sql.upper().strip()
    if not upper.startswith("SELECT"):
        return {"error": "只允许 SELECT 查询"}
    
    dangerous = ["DROP", "DELETE", "UPDATE", "INSERT", "ALTER", "CREATE", "PRAGMA"]
    for word in dangerous:
        if word in upper:
            return {"error": f"不允许使用 {word} 语句"}
    
    if not DB_PATH.exists():
        return {"error": "数据库不存在"}
    
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    try:
        cursor.execute(sql)
        rows = cursor.fetchall()
        columns = [description[0] for description in cursor.description] if cursor.description else []
        data = [dict(row) for row in rows]
        conn.close()
        return {"data": data, "columns": columns, "count": len(data)}
    except Exception as e:
        conn.close()
        return {"error": str(e)}

async def get_checkpoint_detail(session_id: str, checkpoint_id: str):
    """
    获取特定 checkpoint 的详细信息，包括消息列表
    """
    db_path = BASE_DIR / "agent_memory.db"
    if not db_path.exists():
        return {"error": "Database not found"}
    
    try:
         # 把 checkpoint_id 放进 config 的 configurable 里
        config = {
            "configurable": {
                "thread_id": session_id,
                "checkpoint_id": checkpoint_id,
            }
        }
        row_data = None

        with SqliteSaver.from_conn_string(str(db_path)) as checkpointer:
            cp_tuple_list = checkpointer.list(config)
            
            if not cp_tuple_list:
                return {"error": f"未找到 checkpoint: {checkpoint_id}"}

            for cp_tuple in cp_tuple_list:
                checkpoint_data = cp_tuple.checkpoint
                messages = checkpoint_data.get("channel_values", {}).get("messages", [])
                ns = cp_tuple.config["configurable"].get("checkpoint_ns", "")
                
                row_data = {
                    "checkpoint_id": cp_tuple.config["configurable"].get("checkpoint_id"),
                    "timestamp": checkpoint_data.get("ts"),
                    "parent_checkpoint_id": cp_tuple.parent_config["configurable"].get("checkpoint_id") if cp_tuple.parent_config else None,
                    "message_count": len(messages) if messages else 0,
                    "messages": messages,
                    "checkpoint_ns": ns,
                    "thread_id": session_id
            }
        
        return row_data
    except Exception as e:
        import traceback
        print(f"获取 checkpoint 详情失败: {e}")
        print(traceback.format_exc())
        return {"error": str(e)}


async def rollback_to_checkpoint(session_id: str, checkpoint_id: str):
    """
    回退到指定的 checkpoint
    """
    db_path = BASE_DIR / "agent_memory.db"
    if not db_path.exists():
        return {"status": "error", "message": "Database not found"}
    
    try:
        import sqlite3
        conn = sqlite3.connect(str(db_path))
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # 1. 获取目标 checkpoint 的数据
        cursor.execute("""
            SELECT checkpoint_id, checkpoint, timestamp
            FROM checkpoints 
            WHERE thread_id = ? AND checkpoint_id = ?
        """, (session_id, checkpoint_id))
        
        target_cp = cursor.fetchone()
        if not target_cp:
            conn.close()
            return {"status": "error", "message": "Checkpoint not found"}
        
        # 2. 获取目标 checkpoint 的时间戳
        target_time = target_cp.get('timestamp')
        if target_time is None:
            checkpoint_data = json.loads(target_cp['checkpoint'])
            target_time = checkpoint_data.get('timestamp', 0)
        
        # 3. 删除该 checkpoint 之后的所有 checkpoints
        if target_time:
            cursor.execute("""
                DELETE FROM checkpoints 
                WHERE thread_id = ? AND timestamp > ?
            """, (session_id, target_time))
        else:
            # 如果没有时间戳，删除所有后续的 checkpoints
            cursor.execute("""
                DELETE FROM checkpoints 
                WHERE thread_id = ? AND checkpoint_id != ?
            """, (session_id, checkpoint_id))
        
        # 4. 解析消息数量
        checkpoint_data = json.loads(target_cp['checkpoint']) if target_cp['checkpoint'] else {}
        messages = checkpoint_data.get('channel_values', {}).get('messages', [])
        
        conn.commit()
        conn.close()
        
        return {
            "status": "success",
            "message": f"已回退到 checkpoint {checkpoint_id}",
            "message_count": len(messages),
            "used_tokens": len(str(checkpoint_data))  # 大概的 token 数量
        }
    except Exception as e:
        import traceback
        print(f"回退失败: {e}")
        print(traceback.format_exc())
        return {"status": "error", "message": str(e)}


async def compare_checkpoints(
    session_id: str, 
    checkpoint_a: str, 
    checkpoint_b: str
):
    """
    比较两个 checkpoint 的差异
    """
    db_path = BASE_DIR / "agent_memory.db"
    if not db_path.exists():
        return {"error": "Database not found"}
    
    try:
        
        # 获取两个 checkpoint
        cpa = await get_checkpoint_detail(session_id, checkpoint_a)
        cpb = await get_checkpoint_detail(session_id, checkpoint_b)
        
        if not cpa or not cpb:
            return {"error": "One or both checkpoints not found"}
        
        cp_data = {}
        for cp in [cpa, cpb]:
            cp_data[cp['checkpoint_id']] = cp
        
        msgs_a = cp_data.get(checkpoint_a, {}).get('messages', [])
        msgs_b = cp_data.get(checkpoint_b, {}).get('messages', [])
        
        # 计算新增的消息
        new_messages = []
        min_len = min(len(msgs_a), len(msgs_b))
        
        for i in range(len(msgs_b)):
            if i < len(msgs_a):
                # 比较内容
                content_a = msgs_a[i].get('content', '')
                content_b = msgs_b[i].get('content', '')
                if content_a != content_b:
                    new_messages.append({
                        "index": i,
                        "type": msgs_b[i].get('type', 'unknown'),
                        "content": content_b[:100] + ("..." if len(content_b) > 100 else "")
                    })
            else:
                # 新增的消息
                new_messages.append({
                    "index": i,
                    "type": msgs_b[i].get('type', 'unknown'),
                    "content": msgs_b[i].get('content', '')[:100] + ("..." if len(msgs_b[i].get('content', '')) > 100 else "")
                })
        
        return {
            "checkpoint_a": checkpoint_a,
            "timestamp_a": cp_data.get(checkpoint_a, {}).get('timestamp'),
            "checkpoint_b": checkpoint_b,
            "timestamp_b": cp_data.get(checkpoint_b, {}).get('timestamp'),
            "diff": {
                "message_count_a": len(msgs_a),
                "message_count_b": len(msgs_b),
                "difference": len(msgs_b) - len(msgs_a),
                "new_messages": new_messages
            }
        }
    except Exception as e:
        import traceback
        print(f"比较失败: {e}")
        print(traceback.format_exc())
        return {"error": str(e)}

async def get_checkpoint_history(session_id: str, limit: int = 50, page: int = 1):
    """
    获取会话的 checkpoint 历史
    """
    db_path = BASE_DIR / "agent_memory.db"
    try:
        return await get_checkpoints_detail(session_id, limit, page)
    except Exception as e:
        import traceback
        print(f"获取 checkpoint 历史失败: {e}")
        print(traceback.format_exc())
        return {"error": str(e), "checkpoints": []}

async def get_checkpoint_graph(session_id: str):
    """
    获取 checkpoint 链的图数据，用于可视化
    """
    db_path = BASE_DIR / "agent_memory.db"
    if not db_path.exists():
        return {"session_id": session_id, "nodes": [], "edges": [], "total": 0}
    
    try:
        import sqlite3
        conn = sqlite3.connect(str(db_path))
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # 获取所有 checkpoints
        cursor.execute("""
            SELECT 
                checkpoint_id,
                parent_checkpoint_id,
                checkpoint
            FROM checkpoints 
            WHERE thread_id = ?
            ORDER BY checkpoint_id
        """, (session_id,))
        
        rows = cursor.fetchall()
        
        nodes = []
        edges = []
        
        for row in rows:
            # 解析消息数量
            checkpoint_data = json.loads(row['checkpoint']) if row['checkpoint'] else {}
            messages = checkpoint_data.get('channel_values', {}).get('messages', [])
            msg_count = len(messages)
            
            nodes.append({
                "id": row['checkpoint_id'],
                "label": f"#{row['checkpoint_id'][:8]}\n{msg_count} msg",
                "timestamp": extract_time(row['checkpoint_id'])
            })
            
            if row['parent_checkpoint_id']:
                edges.append({
                    "from": row['parent_checkpoint_id'],
                    "to": row['checkpoint_id']
                })
        
        conn.close()
        
        return {
            "session_id": session_id,
            "nodes": nodes,
            "edges": edges,
            "total": len(nodes)
        }
    except Exception as e:
        import traceback
        print(f"生成图失败: {e}")
        print(traceback.format_exc())
        return {"error": str(e), "nodes": [], "edges": [], "total": 0}

async def get_blob_size(table_name: str, limit: int = 20):
    """查看 BLOB 字段的大小分布"""
    if table_name not in allowed_tables:
        return {"error": "只支持 checkpoints 和 writes 表"}
    
    if not DB_PATH.exists():
        return {"error": "数据库不存在"}
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    if table_name == "checkpoints":
        cursor.execute("""
            SELECT thread_id, checkpoint_id, 
                   LENGTH(checkpoint) as checkpoint_size,
                   LENGTH(metadata) as metadata_size,
                   LENGTH(checkpoint) + LENGTH(metadata) as total
            FROM checkpoints
            ORDER BY total DESC
            LIMIT ?
        """, (limit,))
    else:
        cursor.execute("""
            SELECT thread_id, checkpoint_id, task_id,
                   LENGTH(value) as value_size
            FROM writes
            ORDER BY value_size DESC
            LIMIT ?
        """, (limit,))
    
    rows = cursor.fetchall()
    conn.close()
    
    result = []
    for row in rows:
        if table_name == "checkpoints":
            result.append({
                "thread_id": row[0],
                "checkpoint_id": row[1],
                "checkpoint_size": row[2],
                "checkpoint_size_mb": round(row[2] / 1024 / 1024, 2),
                "metadata_size": row[3],
                "metadata_size_mb": round(row[3] / 1024 / 1024, 2),
                "total": row[4],
                "total_mb": round(row[4] / 1024 / 1024, 2)
            })
        else:
            result.append({
                "thread_id": row[0],
                "checkpoint_id": row[1],
                "task_id": row[2],
                "value_size": row[3],
                "value_size_mb": round(row[3] / 1024 / 1024, 2)
            })
    
    return {"table": table_name, "records": result}


async def delete_record(
    table_name: str,
    thread_id: str,
    checkpoint_id: str,
    checkpoint_ns: str = ""
):
    """删除指定的记录"""
    if table_name not in allowed_tables:
        return {"error": "只支持 checkpoints 和 writes 表"}
    
    if not DB_PATH.exists():
        return {"error": "数据库不存在"}
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        if table_name == "checkpoints":
            cursor.execute(
                "DELETE FROM checkpoints WHERE thread_id = ? AND checkpoint_id = ? AND checkpoint_ns = ?",
                (thread_id, checkpoint_id, checkpoint_ns or "")
            )
        else:
            cursor.execute(
                "DELETE FROM writes WHERE thread_id = ? AND checkpoint_id = ? AND checkpoint_ns = ?",
                (thread_id, checkpoint_id, checkpoint_ns or "")
            )
        
        deleted = cursor.rowcount
        conn.commit()
        conn.close()
        return {"status": "success", "deleted": deleted}
    except Exception as e:
        conn.close()
        return {"error": str(e)}


async def clean_table(
    table_name: str,
    keep_count: int = 10
):
    """清理表，每个 thread_id 只保留最近的 N 条"""
    if table_name not in allowed_tables:
        return {"error": "只支持 checkpoints 和 writes 表"}
    
    if not DB_PATH.exists():
        return {"error": "数据库不存在"}
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    total_deleted = 0
    
    # 获取所有 thread_id
    cursor.execute(f"SELECT DISTINCT thread_id FROM {table_name}")
    thread_ids = [row[0] for row in cursor.fetchall()]
    
    for tid in thread_ids:
        cursor.execute(f"""
            SELECT checkpoint_id FROM {table_name}
            WHERE thread_id = ?
            ORDER BY checkpoint_id DESC
            LIMIT ?
        """, (tid, keep_count))
        keep_ids = [row[0] for row in cursor.fetchall()]
        
        if keep_ids:
            placeholders = ','.join(['?'] * len(keep_ids))
            cursor.execute(f"""
                DELETE FROM {table_name}
                WHERE thread_id = ? AND checkpoint_id NOT IN ({placeholders})
            """, (tid, *keep_ids))
            total_deleted += cursor.rowcount
    
    conn.commit()
    conn.close()
    
    return {"status": "success", "deleted": total_deleted, "thread_count": len(thread_ids)}

def extract_time(uuid_str: str) -> datetime:
    """
    从 UUID v6 或 v7 字符串中提取生成时间（UTC）。
    根据版本号自动选择解析逻辑。
    """
    UUID_EPOCH_OFFSET_100NS = 0x01B21DD213814000

    # 1. 清理字符串并校验基础格式
    hex_str = uuid_str.replace("-", "").lower()
    if len(hex_str) != 32:
        raise ValueError("UUID 长度不合法")

    # 2. 读取版本号（第 13 个 hex 字符，索引 12）
    version = int(hex_str[12], 16)

    if version == 7:
        # --- UUID v7: 前 12 个 hex 字符就是 Unix 毫秒时间戳 ---
        timestamp_ms = int(hex_str[:12], 16)
        return datetime.fromtimestamp(timestamp_ms / 1000, tz=timezone.utc)

    elif version == 6:
        # --- UUID v6: 需要重组 60 位时间戳 ---
        # 结构：time_high(32) + time_mid(16) + version(4) + time_low(12)
        time_high = int(hex_str[0:8], 16)
        time_mid = int(hex_str[8:12], 16)
        # 注意：time_low 在版本号后面，是 hex_str[13:16]（跳过第 13 个字符'6'）
        time_low = int(hex_str[13:16], 16)

        # 拼回 60 位原始时间戳 (100ns 精度)
        timestamp_100ns = (time_high << 28) | (time_mid << 12) | time_low

        # 减去 UUID 纪元偏移，得到 Unix 100ns 时间戳
        unix_100ns = timestamp_100ns - UUID_EPOCH_OFFSET_100NS

        # 转成秒（浮点数保留微秒精度）
        unix_seconds = unix_100ns / 10_000_000

        return datetime.fromtimestamp(unix_seconds, tz=timezone.utc)

    else:
        raise ValueError(f"不支持的 UUID 版本: v{version}，仅支持 v6 和 v7")



async def get_checkpoints_detail(session_id: str, limit: int = 50, page: int = 1):
    db_path = DB_PATH
    if not db_path.exists():
        return {"session_id": session_id, "checkpoints": []}

    total = 0
    next_cursor = None

    try:
        import sqlite3
        conn = sqlite3.connect(str(db_path))
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # 获取所有 checkpoints
        cursor.execute("""
            SELECT checkpoint_id FROM checkpoints WHERE thread_id = ? and checkpoint_ns = ''
        """, (session_id,))
        rows = cursor.fetchall()
        total = len(rows)
        if page > 1:
            next_index = (page - 1) * limit if total - (page - 1) * limit > 0 else -1
            next_cursor = rows[next_index]['checkpoint_id'] if rows and next_index < len(rows) and next_index >= 0 else None

        conn.close()
    except Exception as e:
        import traceback
        print(f"获取 checkpoint 历史失败: {e}")
        print(traceback.format_exc())
        return {"error": str(e), "checkpoints": []}

    checkpoints = []
    config = {"configurable": {"thread_id": session_id, "checkpoint_ns": ""}}
    before = None
    if next_cursor:
        before = {"configurable": {"thread_id": session_id, "checkpoint_id": next_cursor}}

    with SqliteSaver.from_conn_string(str(db_path)) as checkpointer:
        for cp_tuple in checkpointer.list(config, before=before, limit=limit):
            checkpoint_data = cp_tuple.checkpoint  # 已经是 Python 字典
            ns = cp_tuple.config["configurable"].get("checkpoint_ns", "")
            messages = checkpoint_data.get("channel_values", {}).get("messages", [])
            if ns:
                continue  # 如果没有 ns，则跳过该 checkpoint
            print(f"Checkpoint {cp_tuple.config['configurable'].get('checkpoint_id')} has ns= {ns}.")
            checkpoints.append({
                "checkpoint_id": cp_tuple.config["configurable"].get("checkpoint_id"),
                "timestamp": checkpoint_data.get("ts"),  # LangGraph checkpoint 自带 ts 字段
                "checkpoint_ns": ns,
                "parent_checkpoint_id": cp_tuple.parent_config["configurable"].get("checkpoint_id") if cp_tuple.parent_config else None,
                "message_count": len(messages) if messages else 0,
                "messages": messages,
                "thread_id": session_id
            })

    return {"session_id": session_id, "checkpoints": checkpoints, "total": total}

# 删除 checkpoint，只保留最近5个
async def prune_checkpoints(thread_id, keep_count=5):
    db_path = DB_PATH
    import sqlite3
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 1. 获取该 thread 下所有不同的命名空间
    cursor.execute("""
        SELECT DISTINCT thread_id, checkpoint_ns 
        FROM checkpoints 
        WHERE thread_id = ?
    """, (thread_id,))
    namespaces = cursor.fetchall()
    
    total_deleted = 0
    for tid, ns in namespaces:
        # 2. 对每个命名空间，找出要保留的 checkpoint ID（最新的 keep_count 个）
        cursor.execute("""
            SELECT checkpoint_id FROM checkpoints 
            WHERE thread_id = ? AND checkpoint_ns = ?
            ORDER BY checkpoint_id DESC 
            LIMIT ?
        """, (tid, ns, keep_count))
        keep_ids = [row[0] for row in cursor.fetchall()]
        
        if not keep_ids:
            continue
        
        # 3. 删除该命名空间下不在保留列表中的 checkpoint
        placeholders = ",".join(["?"] * len(keep_ids))
        cursor.execute(f"""
            DELETE FROM checkpoints 
            WHERE thread_id = ? AND checkpoint_ns = ? 
            AND checkpoint_id NOT IN ({placeholders})
        """, (tid, ns, *keep_ids))
        total_deleted += cursor.rowcount
        
        # 4. 同步清理 writes 表中的关联记录（否则会留下孤儿数据）
        cursor.execute(f"""
            DELETE FROM writes 
            WHERE thread_id = ? AND checkpoint_ns = ? 
            AND checkpoint_id NOT IN ({placeholders})
        """, (tid, ns, *keep_ids))
    
    conn.commit()
    conn.close()
    return total_deleted