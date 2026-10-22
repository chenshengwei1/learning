# session_io.py
"""
聊天会话导出 / 导入。

导出格式（mapping 树 / DAG）:
{
  "id": ..., "title": ..., "inserted_at": ..., "updated_at": ...,
  "mapping": {
     "root": {"id":"root","parent":None,"children":["1"],"message":None},
     "1": {
        "id":"1","parent":"root","children":["2"],
        "message": {
           "model":"deepseek-chat","inserted_at":"...","type":"human",
           "fragments":[
              {"type":"REQUEST","content":"..."},
              {"type":"THINK","content":"..."},
              {"type":"TOOL_CALL","content":"{...}","name":"...","tool_call_id":"..."},
              {"type":"TOOL_RESULT","content":"...","tool_call_id":"...","name":"..."},
              {"type":"RESPONSE","content":"..."},
              {"type":"SYSTEM","content":"..."}
           ]
        }
     }
  }
}

LangChain 消息 ↔ fragment 映射:
  HumanMessage  <-> REQUEST
  AIMessage     <-> RESPONSE / THINK(->additional_kwargs.reasoning_content) / TOOL_CALL(->tool_calls)
  ToolMessage   <-> TOOL_RESULT
  SystemMessage <-> SYSTEM
"""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any, Optional

from langchain_core.messages import BaseMessage
from agent_message import (
    HumanMessageWithMeta as HumanMessage,  # 替换原生的 HumanMessage
    AIMessageWithMeta as AIMessage,        # 替换原生的 AIMessage
    ToolMessageWithMeta as ToolMessage,    # 替换原生的 ToolMessage
    SystemMessageWithMeta as SystemMessage,  # 替换原生的 SystemMessage
)

# 由你的项目提供
# from your_project.agent_registry import get_or_create_agent


# ============================================================
# 一、通用工具
# ============================================================

def _now_iso() -> str:
    return datetime.now().astimezone().isoformat()


def _flatten_content(content: Any) -> str:
    """content 可能是 str 或 list[dict]（多模态），统一拍平成文本。"""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for p in content:
            if isinstance(p, dict):
                parts.append(p.get("text", "") or "")
            else:
                parts.append(str(p))
        return "".join(parts)
    if content is None:
        return ""
    return str(content)


def _parse_args(raw: Any) -> Any:
    """tool_call.args 可能是 dict / list，也可能是 JSON 字符串。"""
    if isinstance(raw, (dict, list)):
        return raw
    if isinstance(raw, str) and raw.strip():
        try:
            return json.loads(raw)
        except Exception:
            return raw
    return {}


# ============================================================
# 二、导出侧：消息 -> fragments
# ============================================================

def _serialize_tool_calls(msg: BaseMessage) -> list[dict]:
    """从 AIMessage 抽取 tool_calls，兼容 LangChain 标准与 OpenAI 原始两种结构。"""
    calls = getattr(msg, "tool_calls", None) or []
    if not calls:
        calls = (getattr(msg, "additional_kwargs", {}) or {}).get("tool_calls", []) or []

    out = []
    for c in calls:
        if not isinstance(c, dict):
            continue
        if "function" in c:  # OpenAI 原始格式
            fn = c.get("function") or {}
            out.append({
                "id": c.get("id", ""),
                "name": fn.get("name", ""),
                "args": fn.get("arguments", ""),
            })
        else:  # LangChain 标准格式
            out.append({
                "id": c.get("id", ""),
                "name": c.get("name", ""),
                "args": c.get("args", ""),
            })
    return out


def _message_to_fragments(msg: BaseMessage) -> list[dict]:
    """把一条 LangChain 消息拆成 fragments。"""
    msg_type = getattr(msg, "type", None)
    content = _flatten_content(getattr(msg, "content", ""))
    fragments: list[dict] = []

    if msg_type == "human" or isinstance(msg, HumanMessage):
        fragments.append({"type": "REQUEST", "content": content})

    elif msg_type in ("ai", "assistant") or isinstance(msg, AIMessage):
        # 推理内容
        reasoning = (getattr(msg, "additional_kwargs", {}) or {}).get("reasoning_content")
        if reasoning:
            fragments.append({"type": "THINK", "content": reasoning})

        # 工具调用
        for tc in _serialize_tool_calls(msg):
            fragments.append({
                "type": "TOOL_CALL",
                "content": tc.get("args", ""),
                "name": tc.get("name", ""),
                "tool_call_id": tc.get("id", ""),
            })

        # 正文
        if content:
            fragments.append({"type": "RESPONSE", "content": content})

        # 保结构：既无正文也无 think / tool
        if not fragments:
            fragments.append({"type": "RESPONSE", "content": ""})

    elif msg_type == "tool" or isinstance(msg, ToolMessage):
        fragments.append({
            "type": "TOOL_RESULT",
            "content": content,
            "tool_call_id": getattr(msg, "tool_call_id", "") or "",
            "name": getattr(msg, "name", "") or "",
        })

    elif msg_type == "system":
        fragments.append({"type": "SYSTEM", "content": content})

    else:
        # 未知类型，按 RESPONSE 兜底
        fragments.append({"type": "RESPONSE", "content": content})

    return fragments


# ============================================================
# 三、导出入口
# ============================================================

def export_session(session_id: str, session:dict, state) -> dict:
    """导出聊天记录为 mapping DAG（含 think / tool）。"""

    saved_conversation = {
        "id": session_id,
        "title": session.get("name", ""),
        "inserted_at": getattr(session, "create_date", ""),
        "updated_at": _now_iso(),
        "mapping": {},
    }

    if not (state and state.values):
        return saved_conversation

    messages = state.values.get("messages", []) or []

    saved_conversation["mapping"]["root"] = {
        "id": "root",
        "parent": None,
        "children": [],
        "message": None,
    }

    prev_id = "root"
    for i, msg in enumerate(messages):
        node_id = str(i + 1)
        fragments = _message_to_fragments(msg)

        additional = getattr(msg, "additional_kwargs", {}) or {}
        response_meta = getattr(msg, "response_metadata", {}) or {}

        saved_conversation["mapping"][node_id] = {
            "id": node_id,
            "parent": prev_id,
            "children": [],
            "message": {
                "model": response_meta.get("model_name", "")
                         or additional.get("model", "")
                         or "deepseek-chat",
                "inserted_at": additional.get("inserted_at", "")
                               or response_meta.get("created_at", "")
                               or _now_iso(),
                "type": getattr(msg, "type", ""),
                "fragments": fragments,
            },
        }

        saved_conversation["mapping"][prev_id]["children"].append(node_id)
        prev_id = node_id

    return saved_conversation


# ============================================================
# 四、导入侧：fragments -> 消息
# ============================================================

def _node_to_message(node: dict) -> Optional[BaseMessage]:
    """把一个 mapping 节点还原为 LangChain 消息（支持 think / tool_call / tool_result）。"""
    msg_node = node.get("message")
    if not msg_node:
        return None

    fragments = msg_node.get("fragments") or []
    if not fragments:
        return None

    inserted_at = msg_node.get("inserted_at", "")
    base_kwargs = {"inserted_at": inserted_at, "node_id": node.get("id")}

    # 聚合各类 fragment
    response_parts: list[str] = []
    think_parts: list[str] = []
    system_parts: list[str] = []
    tool_calls: list[dict] = []
    tool_results: list[dict] = []

    for frag in fragments:
        ftype = frag.get("type")
        content = frag.get("content", "")
        if ftype == "REQUEST":
            response_parts.append(content)
        elif ftype == "RESPONSE":
            response_parts.append(content)
        elif ftype == "THINK":
            think_parts.append(content)
        elif ftype == "SYSTEM":
            system_parts.append(content)
        elif ftype == "TOOL_CALL":
            tool_calls.append({
                "id": frag.get("tool_call_id", "") or frag.get("id", ""),
                "name": frag.get("name", ""),
                "args": _parse_args(content),
            })
        elif ftype == "TOOL_RESULT":
            tool_results.append(frag)

    # 1) TOOL_RESULT -> ToolMessage（优先，一条 tool 结果对应一条消息）
    if tool_results:
        tr = tool_results[0]
        return ToolMessage(
            content=tr.get("content", ""),
            tool_call_id=tr.get("tool_call_id", "") or "",
            name=tr.get("name", "") or "",
            additional_kwargs=base_kwargs,
        )

    first_type = fragments[0].get("type")

    # 2) SYSTEM
    if first_type == "SYSTEM":
        return SystemMessage(
            content="\n".join(system_parts),
            additional_kwargs=base_kwargs,
        )

    # 3) REQUEST
    if first_type == "REQUEST":
        return HumanMessage(
            content="\n".join(response_parts),
            additional_kwargs=base_kwargs,
        )

    # 4) 默认 AIMessage（RESPONSE / THINK / TOOL_CALL）
    kwargs = dict(base_kwargs)
    if think_parts:
        kwargs["reasoning_content"] = "\n".join(think_parts)

    ai = AIMessage(
        content="\n".join(response_parts),
        additional_kwargs=kwargs,
        tool_calls=tool_calls or [],
    )

    # OpenAI 原始 tool_calls 双写，兼容只读 additional_kwargs 的下游
    if tool_calls:
        ai.additional_kwargs["tool_calls"] = [
            {
                "id": tc["id"],
                "type": "function",
                "function": {
                    "name": tc["name"],
                    "arguments": tc["args"] if isinstance(tc["args"], str)
                                 else json.dumps(tc["args"], ensure_ascii=False),
                },
            }
            for tc in tool_calls
        ]

    return ai


# ============================================================
# 五、DAG 路径收集与合并
# ============================================================

def _collect_dag_paths(mapping: dict) -> list[list[str]]:
    """DFS 收集 root -> 叶子 的所有节点 id 路径（不含 root）。"""
    paths: list[list[str]] = []
    visiting: set[str] = set()

    def dfs(node_id: str, path: list[str]):
        if node_id in visiting:
            return
        node = mapping.get(node_id)
        if node is None:
            return
        visiting.add(node_id)
        new_path = path if node_id == "root" else path + [node_id]
        children = node.get("children") or []
        if not children:
            if new_path:
                paths.append(new_path)
        else:
            for child in children:
                dfs(child, new_path)
        visiting.discard(node_id)

    dfs("root", [])
    return paths


def _build_branch_metadata(paths: list[list[str]], mapping: dict) -> dict:
    """记录分支点：{node_id: {branch_heads, branches:[{head,leaf}]}}。"""
    branch_info: dict[str, dict] = {}
    for node_id, node in mapping.items():
        children = node.get("children") or []
        if len(children) <= 1:
            continue
        info = {"branch_heads": list(children), "branches": []}
        for child in children:
            leaf = child
            visited = {child}
            while True:
                nxt = [c for c in (mapping.get(leaf, {}).get("children") or [])
                       if c not in visited]
                if not nxt:
                    break
                leaf = nxt[0]
                visited.add(leaf)
            info["branches"].append({"head": child, "leaf": leaf})
        branch_info[node_id] = info
    return branch_info


def _merge_paths_to_linear(paths: list[list[str]], mapping: dict) -> list[dict]:
    """最长公共前缀保留一份，其余分支节点按路径顺序追加并去重。"""
    if not paths:
        return []

    prefix = paths[0]
    for p in paths[1:]:
        i = 0
        while i < len(prefix) and i < len(p) and prefix[i] == p[i]:
            i += 1
        prefix = prefix[:i]

    seen = set(prefix)
    ordered = list(prefix)
    for p in paths:
        for nid in p:
            if nid not in seen:
                seen.add(nid)
                ordered.append(nid)

    return [mapping[nid] for nid in ordered if mapping.get(nid)]


# ============================================================
# 六、导入入口
# ============================================================

async def import_session(
    session_id: str,
    saved_conversation: dict,
    session:dict,
    as_node: str = "agent",
    merge_strategy: str = "dedup",   # "dedup" | "per_path"
) -> dict:
    """
    把导出格式（mapping DAG）导入到指定 session。

    merge_strategy:
      - "dedup"    : 公共前缀合并，分支节点去重后线性排列（默认）
      - "per_path" : 每条 root->leaf 路径单独写一轮完整消息
    """
    agent = session["agent"]
    config = session["config"]

    mapping = saved_conversation.get("mapping", {}) or {}
    if not mapping:
        return {"branches": 0, "merged_messages": [], "paths": [], "branch_info": {}}

    paths = _collect_dag_paths(mapping)
    branch_info = _build_branch_metadata(paths, mapping)
    n_branches = sum(len(v["branches"]) for v in branch_info.values())

    # per_path：每条路径各写一轮
    if merge_strategy == "per_path":
        written: list[BaseMessage] = []
        for idx, path in enumerate(paths):
            msgs: list[BaseMessage] = []
            for nid in path:
                m = _node_to_message(mapping[nid])
                if m is not None:
                    m.additional_kwargs["branch_path"] = idx
                    msgs.append(m)
            if msgs:
                agent.update_state(config, {"messages": msgs}, as_node=as_node)
                written.extend(msgs)
        return {
            "branches": n_branches,
            "merged_messages": written,
            "paths": paths,
            "branch_info": branch_info,
        }

    # dedup：合并去重后一次写入
    nodes = _merge_paths_to_linear(paths, mapping)
    messages = [m for m in (_node_to_message(n) for n in nodes) if m is not None]

    if messages:
        if branch_info:
            messages[0].additional_kwargs["dag_branch_info"] = branch_info
        agent.update_state(config, {"messages": messages}, as_node=as_node)

    return {
        "branches": n_branches,
        "merged_messages": messages,
        "paths": paths,
        "branch_info": branch_info,
    }


__all__ = ["export_session", "import_session"]