# db_manager.py
from typing import Optional
from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse, JSONResponse
from pathlib import Path
import pickle

# 创建路由器
router = APIRouter(prefix="/api/db", tags=["database"])
tablerouter = APIRouter(prefix="/api/db/table", tags=["databasetable"])

import logging
import db_manager

logger = logging.getLogger(__name__)

# ========== 页面路由 ==========
@router.get("/manager", response_class=HTMLResponse)
async def db_manager_page():
    """获取所有表及其行数和字段信息"""
    return await db_manager.db_manager_page()

# ========== API 接口 ==========

@router.get("/tables")
async def get_db_tables():
    """获取所有表及其行数和字段信息"""
    return await db_manager.get_db_tables()

@router.get("/sessions")
async def get_db_sessions():
    """获取所有会话及其 checkpoint 数量"""
    return await db_manager.get_db_sessions()


@router.delete("/session/{thread_id}")
async def delete_db_session(thread_id: str):
    """删除指定会话的所有数据"""
    return await db_manager.delete_db_session(thread_id)


@router.post("/vacuum")
async def vacuum_db():
    """压缩数据库"""
    return await db_manager.vacuum_db()

@router.get("/size")
async def get_db_size():
    """获取数据库大小"""
    return await db_manager.get_db_size()


@router.post("/query")
async def execute_sql(query: dict):
    """执行 SQL 查询（仅 SELECT）"""
    return await db_manager.execute_sql(query)

# ========== 先注册所有静态/固定路径 ==========
@tablerouter.get("/sessions/{session_id}/checkpoints/compare")
async def compare_checkpoints(
    session_id: str, 
    checkpoint_a: str, 
    checkpoint_b: str
):
    """
    比较两个 checkpoint 的差异
    """
    return await db_manager.compare_checkpoints(session_id, checkpoint_a, checkpoint_b)

@tablerouter.get("/sessions/{session_id}/checkpoints/graph")
async def get_checkpoint_graph(session_id: str):
    """
    获取 checkpoint 链的图数据，用于可视化
    """
    return await db_manager.get_checkpoint_graph(session_id)

@tablerouter.get("/sessions/{session_id}/checkpoints")
async def get_checkpoint_history(session_id: str, limit: int = 50, page: int = 1):
    """
    获取会话的 checkpoint 历史
    """
    return await db_manager.get_checkpoint_history(session_id, limit, page)

@tablerouter.get("/sessions/{session_id}/checkpoints/{checkpoint_id}")
async def get_checkpoint_detail(session_id: str, checkpoint_id: str):
    """
    获取特定 checkpoint 的详细信息，包括消息列表
    """
    return await db_manager.get_checkpoint_detail(session_id, checkpoint_id)


# ========== 再注册动态路径 ==========
@tablerouter.post("/sessions/{session_id}/rollback/{checkpoint_id}")
async def rollback_to_checkpoint(session_id: str, checkpoint_id: str):
    """
    回退到指定的 checkpoint
    """
    return await db_manager.rollback_to_checkpoint(session_id, checkpoint_id)

@tablerouter.get("/{table_name}/blob-size")
async def get_blob_size(table_name: str, limit: int = 20):
    """查看 BLOB 字段的大小分布"""
    return await db_manager.get_blob_size(table_name, limit)


@tablerouter.delete("/{table_name}/record")
async def delete_record(
    table_name: str,
    thread_id: str,
    checkpoint_id: str,
    checkpoint_ns: str = ""
):
    """删除指定的记录"""
    return await db_manager.delete_record(table_name, thread_id, checkpoint_id, checkpoint_ns)


@tablerouter.post("/{table_name}/clean")
async def clean_table(
    table_name: str,
    keep_count: int = 10
):
    """清理表，每个 thread_id 只保留最近的 N 条"""
    return await db_manager.clean_table(table_name, keep_count)

@tablerouter.get("/{table_name}") # 最"泛"的放最后
async def get_table_data(
    table_name: str, 
    page: int = 1, 
    limit: int = 50,
    thread_id: Optional[str] = None
):
    """获取表数据（分页）"""
    return await db_manager.get_table_data(table_name, page, limit, thread_id)