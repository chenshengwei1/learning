"""
完整追踪 recursion_limit 的传递链
"""
import asyncio
from langgraph.graph import StateGraph, END
from typing import TypedDict
from langchain_core.runnables.config import ensure_config, merge_configs, DEFAULT_RECURSION_LIMIT
from langchain_core.runnables.base import RunnableBinding, RunnableBindingBase

class State(TypedDict):
    counter: int

def node1(state):
    return {"counter": state["counter"] + 1}

workflow = StateGraph(State)
workflow.add_node("node1", node1)
workflow.set_entry_point("node1")
workflow.add_edge("node1", END)

# 编译并设置 recursion_limit
app = workflow.compile()
print(f"原始 app (Pregel instance):")
print(f"  type: {type(app)}")
print(f"  hasattr('config'): {hasattr(app, 'config')}")
print(f"  config: {getattr(app, 'config', 'NO CONFIG')}")
print()

# 使用 with_config
app_with_50 = app.with_config({"recursion_limit": 50})
print(f"with_config 后 app_with_50:")
print(f"  type: {type(app_with_50)}")
print(f"  isinstance(RunnableBinding): {isinstance(app_with_50, RunnableBinding)}")
print(f"  hasattr('config'): {hasattr(app_with_50, 'config')}")
print(f"  config: {app_with_50.config}")
print()

# 检查 bound
if hasattr(app_with_50, 'bound'):
    print(f"  bound type: {type(app_with_50.bound)}")
    print(f"  bound.config: {getattr(app_with_50.bound, 'config', 'NO CONFIG')}")
print()

# 模拟调用 astream_events 时的 config 合并
user_config = {"configurable": {"thread_id": "test"}}
print(f"user_config: {user_config}")

# RunnableBindingBase._merge_configs 会调用 merge_configs(self.config, user_config)
merged = merge_configs(app_with_50.config, user_config)
print(f"merge_configs(app.config, user_config): {merged}")

# 然后 Pregel.astream 会调用 ensure_config(self.config, merged)
# 其中 self.config 是底层 Pregel 的 config
print()
print("=== 模拟 Pregel.astream 内部的 config 处理 ===")
print(f"  app_with_50.config (self.config in astream): {app_with_50.config}")
final_config = ensure_config(app_with_50.config, merged)
print(f"  ensure_config(app.config, merged): {final_config}")
print(f"  final recursion_limit: {final_config.get('recursion_limit')}")

# 验证：如果直接调用 astream，config 会被正确传递吗？
print()
print("=== 测试实际调用 astream 的行为 ===")
print("注意：这里不实际执行，只检查 config 设置")
