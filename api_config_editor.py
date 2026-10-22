# api_config_editor.py
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import yaml
import json
from typing import List, Optional, Dict, Any
import os


CONFIG_PATH = "config/main_graph.yaml"

# ===== 数据模型 =====
class NodeConfig(BaseModel):
    id: str
    name: str
    type: str = "node"  # node, router, subgraph
    code: Optional[str] = None
    config: Optional[str] = None  # subgraph 专用
    inputs: List[str] = []
    outputs: List[str] = []

class EdgeConfig(BaseModel):
    from_node: str
    to_node: str
    label: Optional[str] = None

class RouterConfig(BaseModel):
    from_node: str
    routes: Dict[str, str]  # {"tools": "tools", "__end__": "__end__"}

class GraphConfig(BaseModel):
    name: str
    entry: str
    nodes: List[NodeConfig]
    edges: List[EdgeConfig]
    routers: Optional[List[RouterConfig]] = []

# ===== 预置节点（所有可用节点） =====
PRESET_NODES = {
    "sanitize": {
        "id": "sanitize",
        "name": "输入清洗",
        "type": "node",
        "code": "agent.nodes.sanitize_input",
        "inputs": ["user_input"],
        "outputs": ["clean_input"]
    },
    "load_history": {
        "id": "load_history",
        "name": "加载并压缩历史",
        "type": "node",
        "code": "agent.nodes.load_and_compress_history",
        "inputs": ["messages", "thread_id"],
        "outputs": ["full_messages", "context_messages"]
    },
    "retrieve": {
        "id": "retrieve",
        "name": "RAG检索",
        "type": "node",
        "code": "agent.nodes.retrieve_knowledge",
        "inputs": ["query"],
        "outputs": ["knowledge"]
    },
    "build": {
        "id": "build",
        "name": "组装消息",
        "type": "node",
        "code": "agent.nodes.build_messages_with_knowledge",
        "inputs": ["messages", "knowledge", "history"],
        "outputs": ["messages"]
    },
    "call_model": {
        "id": "call_model",
        "name": "调用大模型",
        "type": "node",
        "code": "agent.nodes.call_model",
        "inputs": ["messages"],
        "outputs": ["llm_response"]
    },
    "validate": {
        "id": "validate",
        "name": "响应校验",
        "type": "router",
        "code": "agent.nodes.validate_response",
        "inputs": ["messages"],
        "outputs": ["validation", "error_msg"]
    },
    "execute_tools": {
        "id": "execute_tools",
        "name": "工具执行",
        "type": "node",
        "code": "agent.nodes.execute_tools",
        "inputs": ["messages"],
        "outputs": ["tool_results"]
    },
    "handle_error": {
        "id": "handle_error",
        "name": "错误处理",
        "type": "node",
        "code": "agent.nodes.handle_error",
        "inputs": ["error_msg"],
        "outputs": ["messages"]
    }
}

# ===== 预置子图 =====
PRESET_SUBGRAPHS = {
    "llm_subgraph": {
        "id": "llm_subgraph",
        "name": "LLM子图",
        "type": "subgraph",
        "config": "llm_subgraph.yaml",
        "inputs": ["messages", "thread_id"],
        "outputs": ["messages"]
    }
}

# ===== API =====

def get_preset_nodes():
    """获取所有预置节点"""
    return {"nodes": PRESET_NODES, "subgraphs": PRESET_SUBGRAPHS}

def get_config():
    """获取当前 YAML 配置"""
    try:
        with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
            config = yaml.safe_load(f)
        return config
    except FileNotFoundError:
        return {"name": "新配置", "entry": "start", "nodes": [], "edges": []}

def save_config(config: Dict[str, Any]):
    """保存 YAML 配置"""
    with open(CONFIG_PATH, 'w', encoding='utf-8') as f:
        yaml.dump(config, f, allow_unicode=True, default_flow_style=False, sort_keys=False)
    return {"status": "ok", "message": "配置已保存"}