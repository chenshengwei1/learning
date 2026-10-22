"""
调试 recursion_limit bug - 验证 config 传递链
"""
import asyncio
from langgraph.graph import StateGraph, END
from typing import TypedDict
from langchain_core.runnables.config import ensure_config, merge_configs

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
print(f"原始 app.config: {app.config}")
print(f"原始 app.recursion_limit: {getattr(app, 'recursion_limit', 'N/A')}")

# 使用 with_config
app_with_50 = app.with_config({"recursion_limit": 50})
print(f"\nwith_config 后 app_with_50.config: {app_with_50.config}")
print(f"app_with_50.bound.config: {app_with_50.bound.config}")

# 模拟调用 astream_events 时的 config 合并
user_config = {"configurable": {"thread_id": "test"}}
print(f"\nuser_config: {user_config}")

# RunnableBindingBase._merge_configs 会调用 merge_configs(self.config, user_config)
merged = merge_configs(app_with_50.config, user_config)
print(f"merge_configs(app_with_50.config, user_config): {merged}")

# 然后 Pregel.astream 会调用 ensure_config(self.config, merged)
# 其中 self.config 是底层 app 的 config（可能为 None）
final_config = ensure_config(app.config, merged)
print(f"ensure_config(app.config, merged): {final_config}")
print(f"final recursion_limit: {final_config.get('recursion_limit')}")
