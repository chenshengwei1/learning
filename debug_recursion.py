"""
调试 recursion_limit 的 bug
"""
import os
import sys
from pathlib import Path

# 添加项目根目录到路径
sys.path.insert(0, str(Path(__file__).parent))
os.chdir(Path(__file__).parent)

from langchain_core.runnables.config import merge_configs, DEFAULT_RECURSION_LIMIT, ensure_config

print("=" * 80)
print("测试 1: merge_configs 和 ensure_config 的行为")
print("=" * 80)
print(f"DEFAULT_RECURSION_LIMIT: {DEFAULT_RECURSION_LIMIT}")
print()

# 测试1: ensure_config 默认值
config1 = ensure_config(None)
print(f"ensure_config(None): {config1}")
print()

# 测试2: ensure_config 带 recursion_limit
config2 = ensure_config({'recursion_limit': 50})
print(f"ensure_config({{'recursion_limit': 50}}): {config2}")
print()

# 测试3: merge_configs(50)
config3 = merge_configs({'recursion_limit': 50})
print(f"merge_configs({{'recursion_limit': 50}}): {config3}")
print()

# 测试4: merge_configs(50, None)
config4 = merge_configs({'recursion_limit': 50}, None)
print(f"merge_configs({{'recursion_limit': 50}}, None): {config4}")
print()

# 测试5: merge_configs(50, configurable)
config5 = merge_configs({'recursion_limit': 50}, {'configurable': {'thread_id': 'test'}})
print(f"merge_configs({{'recursion_limit': 50}}, {{'configurable': {{'thread_id': 'test'}}}}): {config5}")
print()

print("=" * 80)
print("测试 2: LangGraph Pregel 的 with_config")
print("=" * 80)

from langgraph.graph import StateGraph, END
from typing import TypedDict

class State(TypedDict):
    messages: list
    counter: int

def node1(state):
    return {"counter": state["counter"] + 1}

workflow = StateGraph(State)
workflow.add_node("node1", node1)
workflow.set_entry_point("node1")
workflow.add_edge("node1", END)

app = workflow.compile()

# 测试 without config
print(f"app.config: {app.config if hasattr(app, 'config') else 'NO CONFIG'}")
print()

# 测试 with_config
app_with_50 = app.with_config({"recursion_limit": 50})
print(f"app_with_50.config: {app_with_50.config}")
print(f"app_with_50.bound.config: {app_with_50.bound.config}")
print()

# 测试调用 astream_events 时的 config 合并
print("测试调用 astream_events 时的 config 合并:")
merged = merge_configs(app_with_50.config, {"configurable": {"thread_id": "test"}})
print(f"merge_configs(app.config, user_config): {merged}")
print()

print("=" * 80)
print("测试 3: 模拟 agent_core.py 的调用链")
print("=" * 80)

# 模拟 create_agent 中的调用
recursion_limit = 50
config_with_limit = {"recursion_limit": recursion_limit}
print(f"with_config config: {config_with_limit}")

# 模拟 with_config 返回的对象
bound_app = app.with_config(config_with_limit)
print(f"bound_app.config: {bound_app.config}")
print(f"bound_app.bound.config: {bound_app.bound.config}")
print()

# 模拟调用 astream_events 时传入 user_config
user_config = {"configurable": {"thread_id": "session1"}}
print(f"user_config: {user_config}")

# 模拟 RunnableBindingBase._merge_configs
merged_final = merge_configs(bound_app.config, user_config)
print(f"merged final: {merged_final}")
print(f"merged recursion_limit: {merged_final.get('recursion_limit')}")
print()

# 检查 Pregel 的 config 属性
print(f"Pregel.app.config: {app.config}")
print(f"app.bound.config (if exists): {getattr(app, 'bound', None).config if hasattr(app, 'bound') else 'N/A'}")
