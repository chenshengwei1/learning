# web_server/services/session_service.py
import sqlite3
from datetime import datetime
from typing import Dict, Optional
from collections import defaultdict
import asyncio

from web_server.utils.helpers import (
    generate_session_id,
    generate_session_name,
    save_session_metadata_to_db,
    load_existing_sessions_to_dict
)
from agent_core import create_agent


class SessionService:
    """会话管理服务"""
    
    def __init__(self):
        self._sessions: Dict[str, Dict] = {}
        self._request_queues = defaultdict(asyncio.Queue)
        self._processing_sessions = set()
    
    @property
    def sessions(self) -> Dict[str, Dict]:
        return self._sessions
    
    @property
    def request_queues(self):
        return self._request_queues
    
    @property
    def processing_sessions(self):
        return self._processing_sessions
    
    def get_or_create(self, session_id: str, first_message: str = None) -> Dict:
        """获取或创建会话"""
        if session_id not in self._sessions:
            session_name = "新对话"
            if first_message:
                session_name = generate_session_name(first_message)
            
            save_session_metadata_to_db(session_id, session_name)
            
            self._sessions[session_id] = {
                "agent": create_agent(),
                "config": {"configurable": {"thread_id": session_id}},
                "created_at": datetime.now(),
                "messages": [],
                "context": [],
                "name": session_name,
                "message_count": 0
            }
            print(f"📝 创建新会话: {session_id[:8]} - {session_name}")
        
        if first_message and not self._sessions[session_id].get("agent"):
            self._sessions[session_id]["agent"] = create_agent()
        
        return self._sessions[session_id]
    
    def get(self, session_id: str) -> Optional[Dict]:
        return self._sessions.get(session_id)
    
    def exists(self, session_id: str) -> bool:
        return session_id in self._sessions
    
    def delete(self, session_id: str) -> bool:
        if session_id in self._sessions:
            del self._sessions[session_id]
            return True
        return False
    
    def load_existing_sessions(self):
        """从 SQLite 加载已有会话"""
        load_existing_sessions_to_dict(self._sessions)
    
    def is_processing(self, session_id: str) -> bool:
        return session_id in self._processing_sessions
    
    def mark_processing(self, session_id: str):
        self._processing_sessions.add(session_id)
    
    def mark_done(self, session_id: str):
        if session_id in self._processing_sessions:
            self._processing_sessions.remove(session_id)
    
    def get_queue(self, session_id: str):
        return self._request_queues[session_id]
    
    def remove_queue(self, session_id: str):
        if session_id in self._request_queues:
            del self._request_queues[session_id]


# 全局单例
_session_service = None


def get_session_service() -> SessionService:
    global _session_service
    if _session_service is None:
        _session_service = SessionService()
    return _session_service