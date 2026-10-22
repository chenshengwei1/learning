# agent_core.py
import threading
import asyncio
import os
from pyexpat.errors import messages
import time
import traceback
from typing import Annotated, TypedDict, AsyncGenerator, Dict, Any, List
import operator
import json
import copy
import sys

from dotenv import load_dotenv
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.sqlite import SqliteSaver
from langchain_deepseek import ChatDeepSeek
from langgraph.errors import GraphRecursionError
from langchain.agents import create_agent as langchain_create_agent
from langchain_openai import ChatOpenAI
from langchain_community.agent_toolkits.github.toolkit import GitHubToolkit
from langchain_community.utilities.github import GitHubAPIWrapper

from langchain.agents.middleware import (
    SummarizationMiddleware,
    ToolCallLimitMiddleware,
    PIIMiddleware,
    ModelFallbackMiddleware,
    ModelCallLimitMiddleware
)
from nb_langchain_agentskills import DirectorySkillLoader, SkillsMiddleware
from nb_langchain_agentskills import CompositeSkillLoader
#pip install langchain-agentskills


from langchain_core.messages import BaseMessage


import sqlite3
#from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, ToolMessage

from langgraph.checkpoint.serde.jsonplus import JsonPlusSerializer
from skill.registry import get_skill_registry
skill_registry = get_skill_registry()

sys.stderr.write(">>> WEB_SERVER.PY EXECUTING3\n")
sys.stderr.flush()

# agent_core.py 顶部新增
from mcp_registry import get_mcp_tools

sys.stderr.write(">>> WEB_SERVER.PY EXECUTING2\n")
sys.stderr.flush()

# 导入带元数据的消息类
from agent_message import (
    HumanMessageWithMeta as HumanMessage,  # 替换原生的 HumanMessage
    AIMessageWithMeta as AIMessage,        # 替换原生的 AIMessage
    ToolMessageWithMeta as ToolMessage,    # 替换原生的 ToolMessage
    SystemMessageWithMeta as SystemMessage,  # 替换原生的 SystemMessage
    convert_to_meta_message
)

import functools


from tools import ALL_TOOLS
from prompts import SYSTEM_PROMPT
from logger import  log_api_request, log_api_response, log_tool_result, log_error, log_compression
import agent_eventhandler

sys.stderr.write(">>> WEB_SERVER.PY EXECUTING1\n")


# 导入上下文压缩器
from context_compressor import compress_with_filter, count_messages_tokens
from context_manager import get_context_status
from agent_core_middleware import FullHooksMiddleware

from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver
import aiosqlite
 
load_dotenv()
# logger = setup_logger()
from agent_dump import object_to_str
sys.stderr.write(">>> WEB_SERVER.PY EXECUTING0\n")

import logging

logger = logging.getLogger(__name__)

# ============ 中断管理 ============
class AgentInterrupt(Exception):
    """智能体中断异常"""
    pass

class AgentCancel(Exception):
    """智能体取消异常"""
    pass

_interrupt_flags = {}

def set_interrupt(thread_id: str, action: str):
    _interrupt_flags[thread_id] = action

def clear_interrupt(thread_id: str):
    _interrupt_flags.pop(thread_id, None)

def check_interrupt(thread_id: str):
    if thread_id in _interrupt_flags:
        action = _interrupt_flags[thread_id]
        if action == "cancel":
            raise AgentCancel("操作已取消")
        elif action == "interrupt":
            raise AgentInterrupt("操作已中断")

# ============ 定义skill ============
# loader = DirectorySkillLoader("./skills")
# 分别指向不同的技能根目录
global_loader = DirectorySkillLoader("./skills")          # 全局/个人技能
project_loader = DirectorySkillLoader("./.agents/skills")         # 项目专属技能

# 组合多个 loader
composite = CompositeSkillLoader([global_loader, project_loader])

def list_skills():
    # 3. 获取所有 skill
    all_skills = composite.list_skills()
    return all_skills

# ============ 状态定义 ============
class AgentState(TypedDict):
    messages: Annotated[list, operator.add]   # 完整历史（UI展示用）
    session_id: str
    knowledge: List[dict]      # 新增
    history: List[dict]        # 新增
    validation: str            # 新增
    error_msg: str             # 新增
    retry_count: int           # 新增
    full_messages: List[Any]     # 完整历史
    context_messages: List[Any]  # 处理后上下文
    compression_info: dict       # 压缩信息
    llm_response: Any            # 原始响应
    llm_start_time: float        # 开始时间
    llm_duration_ms: float       # 耗时
    updated_context: List[Any]   # 更新后的上下文
    thread_id: str               # 线程ID


class AsyncToolCallLimitMiddleware(ToolCallLimitMiddleware):
    async def awrap_tool_call(self, request, handler):
        # 直接透传即可，异步路径下不再触发同步回退
        return await handler(request)

class AsyncSkillsMiddleware(SkillsMiddleware):
    async def awrap_tool_call(self, request, handler):
        return await handler(request)

# 1. 初始化 GitHub 工具包
github = GitHubAPIWrapper()
toolkit = GitHubToolkit.from_github_api_wrapper(github)
tools = toolkit.get_tools()
def getTools():
    return tools + ALL_TOOLS + get_mcp_tools()
# ============ 模型创建 ============
from core_model import llm_mgr
deepseek_model = llm_mgr.deepseek()
used_model = deepseek_model
plan_b_model = llm_mgr.agentai()

def create_pro_model():
    return ChatDeepSeek(
        model = deepseek_model.model,
        api_key = deepseek_model.apikey,
        temperature = 0.3,
        streaming=True,  # ✅ 开启流式
    ).bind_tools(getTools())

def create_model():
    # return ChatDeepSeek(
    #     model=used_model.model,
    #     api_key=used_model.apikey,
    #     temperature=0.3,
    #     streaming=True,  # ✅ 开启流式
    # )
    return ChatOpenAI(
        model = used_model.model,           # 第三方平台的模型名
        api_key=used_model.apikey,    # 第三方平台的密钥
        base_url=used_model.url  # 第三方平台的端点
    )

def createAgent():
    # list all tools
    for tool in getTools():
        logger.debug(f"🔧 Tool: {tool.name} - {tool.description}")
    model = create_model()
    rag_agent = langchain_create_agent(
        model=model,  # 传入模型对象
        tools=getTools(),
        system_prompt="你是一个乐于助人的助手。",
        # https://reference.langchain.com/python/langchain/middleware
        middleware=[
            SummarizationMiddleware(model=model, 
                    trigger=("tokens", 400000),      # ✅ 元组格式
                    keep=("messages", 20)),         # ✅ 元组格式),
            # 工具调用限制：单次调用中全局最多 10 次
            ToolCallLimitMiddleware(run_limit=100),
            SkillsMiddleware(loader=composite),
            #/ PII 脱敏
            PIIMiddleware("email", strategy="redact"),
            ModelFallbackMiddleware(ChatOpenAI(
                    model = plan_b_model.model,           # 第三方平台的模型名
                    api_key=plan_b_model.apikey,    # 第三方平台的密钥
                    base_url=plan_b_model.url  # 第三方平台的端点
                )),
            ModelCallLimitMiddleware(thread_limit=100, run_limit=50, exit_behavior="end"),
            FullHooksMiddleware()
        ],
    )
    return rag_agent

# ============ 消息修复函数 ============


def filter_valid_conversation_groups(messages: list) -> list:
    """
    按 HumanMessage 分组，验证每组内的 tool_calls 是否都能找到对应的 ToolMessage
    如果有任何一个 tool_call 找不到对应的 ToolMessage，整组丢弃
    """
    if not messages:
        return messages
    
    logger.debug(f"\n🧹 [过滤有效对话组] 开始处理 {len(messages)} 条消息")
    
    # 分离 ToolMessage
    tool_messages = []
    non_tool_messages = []
    
    for msg in messages:
        if isinstance(msg, ToolMessage):
            tool_messages.append(msg)
        else:
            non_tool_messages.append(msg)
    
    logger.debug(f"  📋 分离结果: ToolMessage {len(tool_messages)} 条，其他 {len(non_tool_messages)} 条")
    
    # 构建 tool_call_id 索引
    tool_call_id_map = {}
    for tm in tool_messages:
        tool_call_id = getattr(tm, "tool_call_id", None)
        if tool_call_id:
            if tool_call_id not in tool_call_id_map:
                tool_call_id_map[tool_call_id] = []
            tool_call_id_map[tool_call_id].append(tm)
    
    logger.debug(f"  📋 索引: {len(tool_call_id_map)} 个唯一的 tool_call_id")
    
    # 按 HumanMessage 分组
    groups = []
    current_group = []
    
    for msg in non_tool_messages:
        if isinstance(msg, HumanMessage):
            if current_group:
                groups.append(current_group)
            current_group = [msg]
        else:
            current_group.append(msg)
    
    if current_group:
        groups.append(current_group)
    
    logger.debug(f"  📋 分组: {len(groups)} 组")
    
    # 验证每组
    valid_groups = []
    invalid_groups = []
    
    for group in groups:
        has_human = any(isinstance(msg, HumanMessage) for msg in group)
        
        if not has_human:
            # 检查是否包含带 tool_calls 的 AIMessage
            has_ai_with_tool_calls = any(
                isinstance(msg, AIMessage) and hasattr(msg, "tool_calls") and msg.tool_calls
                for msg in group
            )
            if has_ai_with_tool_calls:
                invalid_groups.append(group)
                logger.debug(f"  ⚠️ 丢弃组: 有 tool_calls 但无 HumanMessage")
            else:
                valid_groups.append(group)
            continue
        
        # 验证组内所有 tool_calls
        all_valid = True
        missing_ids = []
        
        for msg in group:
            if isinstance(msg, AIMessage) and hasattr(msg, "tool_calls") and msg.tool_calls:
                for tc in msg.tool_calls:
                    tc_id = tc.get("id")
                    if not tc_id or tc_id not in tool_call_id_map:
                        all_valid = False
                        missing_ids.append(tc_id or "(无ID)")
                        break
                if not all_valid:
                    break
        
        if all_valid:
            valid_groups.append(group)
        else:
            invalid_groups.append(group)
            logger.debug(f"  ⚠️ 丢弃组: 缺少 {len(missing_ids)} 个 tool_call_id: {missing_ids[:5]}{'...' if len(missing_ids) > 5 else ''}")
    
    # 构建最终消息列表
    final_messages = []
    for group in valid_groups:
        final_messages.extend(group)
    
    logger.debug(f"\n✅ [过滤完成]")
    logger.debug(f"   原始消息: {len(messages)} 条")
    logger.debug(f"   有效消息: {len(final_messages)} 条")
    logger.debug(f"   丢弃消息: {len(messages) - len(final_messages)} 条")
    logger.debug(f"   ✅ 有效组: {len(valid_groups)} 组")
    logger.debug(f"   ❌ 异常组: {len(invalid_groups)} 组")
    
    return final_messages

def fix_tool_calls_in_messages(messages: list) -> list:
    """
    修复消息中的 tool_calls，确保每个 tool_call 都有对应的 ToolMessage
    只处理最后一条 HumanMessage 之前的消息，之后的消息保持不变
    
    如果找不到对应的 ToolMessage，则清空该 tool_call
    """
    if not messages:
        return messages
    
    logger.debug(f"\n🧹 [修复 tool_calls] 开始处理 {len(messages)} 条消息")
    
    # 🔍 详细打印每条消息的类型和关键信息
    for i, msg in enumerate(messages):
        msg_type = type(msg).__name__
        if isinstance(msg, AIMessage):
            tool_calls = getattr(msg, "tool_calls", [])
            content_preview = str(msg.content)[:50] if msg.content else "(空)"
            logger.debug(f"   [{i}] {msg_type}: content='{content_preview}...', tool_calls={len(tool_calls)}")
            if tool_calls:
                for tc in tool_calls:
                    logger.debug(f"      - tool_call: name={tc.get('name')}, id={tc.get('id')}")
        elif isinstance(msg, ToolMessage):
            tc_id = getattr(msg, "tool_call_id", "无ID")
            content_preview = str(msg.content)[:50] if msg.content else "(空)"
            logger.debug(f"   [{i}] {msg_type}: tool_call_id={tc_id}, content='{content_preview}...'")
        elif isinstance(msg, HumanMessage):
            content_preview = str(msg.content)[:50] if msg.content else "(空)"
            logger.debug(f"   [{i}] {msg_type}: content='{content_preview}...'")
        elif isinstance(msg, SystemMessage):
            content_preview = str(msg.content)[:50] if msg.content else "(空)"
            logger.debug(f"   [{i}] {msg_type}: content='{content_preview}...'")
        else:
            logger.debug(f"   [{i}] {msg_type}: {msg}")
    
    # 1. 找到最后一条 HumanMessage 的位置
    last_human_idx = -1
    for i, msg in enumerate(messages):
        if isinstance(msg, HumanMessage):
            last_human_idx = i
    
    # 如果没有 HumanMessage，则处理所有消息
    if last_human_idx == -1:
        logger.debug("  ⚠️ 未找到 HumanMessage，将处理所有消息")
        target_end_idx = len(messages)
    else:
        target_end_idx = last_human_idx + 1  # 包含最后一条 HumanMessage
        logger.debug(f"  📍 找到最后一条 HumanMessage 在索引 {last_human_idx}，将修复索引 0~{target_end_idx-1} 的消息")
    
    # 2. 提取需要处理的消息片段（最后一条 HumanMessage 之前 + 它本身）
    messages_to_fix = messages[:target_end_idx]
    messages_after = messages[target_end_idx:]  # 后续消息保持不变
    
    logger.debug(f"  📋 待修复片段: {len(messages_to_fix)} 条，后续保持不变: {len(messages_after)} 条")
    
    # 3. 在待修复的片段中构建 tool_call_id 索引
    tool_call_id_map = {}
    for msg in messages_to_fix:
        if isinstance(msg, ToolMessage):
            tool_call_id = getattr(msg, "tool_call_id", None)
            if tool_call_id:
                if tool_call_id not in tool_call_id_map:
                    tool_call_id_map[tool_call_id] = []
                tool_call_id_map[tool_call_id].append(msg)
    
    logger.debug(f"  📋 在待修复片段中索引到 {len(tool_call_id_map)} 个唯一的 tool_call_id")
    
    # 🔍 打印所有可用的 tool_call_id
    if tool_call_id_map:
        logger.debug(f"  📋 可用 tool_call_id: {list(tool_call_id_map.keys())}")
    
    # 4. 修复待处理片段中的 tool_calls
    fixed_messages_prefix = []
    removed_tool_calls = []  # 记录被移除的 tool_calls
    
    for idx, msg in enumerate(messages_to_fix):
        if isinstance(msg, AIMessage) and hasattr(msg, "tool_calls") and msg.tool_calls:
            valid_tool_calls = []
            for tc in msg.tool_calls:
                tc_id = tc.get("id")
                if tc_id and tc_id in tool_call_id_map:
                    valid_tool_calls.append(tc)
                    logger.debug(f"  ✅ 保留 tool_call: name={tc.get('name')}, id={tc_id}")
                else:
                    logger.debug(f"  ❌ 移除无效 tool_call: name={tc.get('name')}, id={tc_id or '无ID'}, 原因: { '不在索引中' if tc_id else '无ID' }")
                    removed_tool_calls.append(tc)
            # 创建新对象或修改原对象
            if len(valid_tool_calls) != len(msg.tool_calls):
                logger.debug(f"  🔧 AIMessage[{idx}] 工具调用从 {len(msg.tool_calls)} 个变为 {len(valid_tool_calls)} 个")
            msg.tool_calls = valid_tool_calls
        fixed_messages_prefix.append(msg)
    
    # 5. 合并修复后的片段 + 保持不变的后半部分
    fixed_messages = fixed_messages_prefix + messages_after
    
    logger.debug(f"\n✅ [修复完成]")
    logger.debug(f"   总消息: {len(fixed_messages)} 条")
    logger.debug(f"   移除的 tool_calls: {len(removed_tool_calls)} 个")
    if removed_tool_calls:
        logger.debug(f"   被移除的 tool_calls: {removed_tool_calls}")
    
    # 🔍 打印修复后的消息结构
    logger.debug(f"\n📋 [修复后的消息结构]")
    for i, msg in enumerate(fixed_messages):
        msg_type = type(msg).__name__
        if isinstance(msg, AIMessage):
            tool_calls = getattr(msg, "tool_calls", [])
            logger.debug(f"   [{i}] {msg_type}: tool_calls={len(tool_calls)}")
            if tool_calls:
                for tc in tool_calls:
                    logger.debug(f"      - {tc.get('name')} (id={tc.get('id')})")
        elif isinstance(msg, ToolMessage):
            logger.debug(f"   [{i}] {msg_type}: tool_call_id={getattr(msg, 'tool_call_id', '无ID')}")
        else:
            logger.debug(f"   [{i}] {msg_type}")
    
    return fixed_messages


def validate_tool_calls_order(messages: list) -> dict:
    """
    验证所有 AIMessage 的 tool_calls 是否都有对应的 ToolMessage，
    并且 ToolMessage 紧跟在 AIMessage 后面（中间不能有其他消息）。
    
    返回:
        {
            "valid": bool,
            "issues": list,  # 问题描述列表
            "details": dict  # 每个 AIMessage 的验证结果
        }
    """
    results = {
        "valid": True,
        "issues": [],
        "details": {}
    }
    
    for i, msg in enumerate(messages):
        # 只检查带有 tool_calls 的 AIMessage
        if not isinstance(msg, AIMessage):
            continue
        
        tool_calls = getattr(msg, "tool_calls", [])
        if not tool_calls:
            continue
        
        tool_call_ids = [tc.get("id") for tc in tool_calls if tc.get("id")]
        expected_count = len(tool_call_ids)
        
        if expected_count == 0:
            continue
        
        # 检查紧接着的 expected_count 条消息
        found_count = 0
        has_issue = False
        issue_reason = ""
        
        for j in range(i + 1, min(i + 1 + expected_count, len(messages))):
            next_msg = messages[j]
            
            if isinstance(next_msg, ToolMessage):
                tool_call_id = getattr(next_msg, "tool_call_id", None)
                if tool_call_id and tool_call_id in tool_call_ids:
                    found_count += 1
                else:
                    has_issue = True
                    issue_reason = f"ToolMessage[{j}] 的 tool_call_id='{tool_call_id}' 不在期望列表中: {tool_call_ids}"
                    break
            else:
                has_issue = True
                issue_reason = f"AIMessage[{i}] 和 ToolMessage[{j}] 之间插入了非 ToolMessage: [{j}] {type(next_msg).__name__}"
                break
        
        # 检查是否所有 tool_call 都找到了对应的 ToolMessage
        if not has_issue and found_count == expected_count:
            results["details"][i] = {
                "valid": True,
                "tool_calls": tool_calls,
                "message": f"✅ AIMessage[{i}] 有 {expected_count} 个 tool_calls，全部有对应的 ToolMessage"
            }
        else:
            results["valid"] = False
            if not has_issue and found_count < expected_count:
                missing_ids = [tid for tid in tool_call_ids if tid not in [getattr(m, "tool_call_id", None) for m in messages[i+1:i+1+expected_count] if isinstance(m, ToolMessage)]]
                issue_reason = f"AIMessage[{i}] 只有 {found_count}/{expected_count} 个 tool_calls 有对应的 ToolMessage，缺少: {missing_ids}"
            
            results["issues"].append(issue_reason)
            results["details"][i] = {
                "valid": False,
                "tool_calls": tool_calls,
                "found_count": found_count,
                "expected_count": expected_count,
                "issue": issue_reason
            }
    
    return results


# 使用示例
def check_and_fix_messages(messages: list) -> list:
    """检查并修复消息顺序"""
    messages = filter_system_messages_safe(messages)
    result = validate_tool_calls_order(messages)
    
    if result["valid"]:
        logger.debug("✅ 所有 tool_calls 顺序正确")
        return messages
    
    logger.debug(f"❌ 发现 {len(result['issues'])} 个问题:")
    for issue in result["issues"]:
        logger.debug(f"   - {issue}")
    
    # 修复逻辑：移除有问题的 AIMessage 的 tool_calls
    fixed_messages = []
    for i, msg in enumerate(messages):
        if i in result["details"] and not result["details"][i]["valid"]:
            # 清空有问题的 tool_calls
            if isinstance(msg, AIMessage):
                logger.debug(f"  🔧 清空 AIMessage[{i}] 的 tool_calls")
                msg.tool_calls = []
        fixed_messages.append(msg)
    
    return messages

def filter_system_messages_safe(messages: list) -> list:
    """
    更安全的版本：只移除系统 AIMessage，不移除 ToolMessage
    
    适合在 call_model 调用 LLM 之前使用，只清理系统错误消息，
    保留 ToolMessage（因为 tool_calls 可能已经处理完了）
    """
    if not messages:
        return messages
    
    logger.debug(f"\n🧹 [过滤系统消息(安全模式)] 开始处理 {len(messages)} 条消息")
    
    # 只移除系统生成的 AIMessage
    filtered_messages = []
    removed_count = 0
    
    for i, msg in enumerate(messages):
        if isinstance(msg, AIMessage):
            additional_kwargs = getattr(msg, "additional_kwargs", {})
            if additional_kwargs.get("is_system_message", False):

                # ✅ 新增条件：检查前一条消息是否为 HumanMessage
                if i > 0 and isinstance(messages[i - 1], HumanMessage):
                    removed_count += 1
                    logger.debug(f"  🗑️ 移除系统消息: [{i}] {msg.content[:50]}...")
                    #continue
        # 如果工具消息下一条是人类消息，需要补充一条AI消息
        if isinstance(msg, HumanMessage):
            if i > 0 and isinstance(messages[i - 1], ToolMessage):
                logger.debug(f"  补充AI消息: [{i}] {msg.content[:50]}...")
                filtered_messages.append(AIMessage(content="内容没有生成，等下次重试",
                additional_kwargs={
                    "error_type": "system_error",        # 错误类型
                    "is_system_message": True,            # 标识是系统生成的
                    "timestamp": time.time()              # 可选：记录时间
                }))

        filtered_messages.append(msg)
    
    logger.debug(f"\n✅ [过滤完成]")
    logger.debug(f"   原始消息: {len(messages)} 条")
    logger.debug(f"   移除系统消息: {removed_count} 条")
    logger.debug(f"   剩余消息: {len(filtered_messages)} 条")
    
    return filtered_messages

def get_content_preview(msg) -> str:
    content = getattr(msg, "content", "") or ""
    # 跳过前导空行，取第一个非空行及之后的内容
    lines = str(content).splitlines()
    for i, line in enumerate(lines):
        if line.strip():
            content = line
            break
    preview = content[:100]
    return preview + (f"...(此处省略{len(content) - 100}字)" if len(content) > 100 else "")

# ============ 图节点 ============


def call_model(state: AgentState) -> AgentState:
    """调用模型节点"""
    logger.debug(f"\n{'='*60}start{'*'*60}start{'='*60}")
    logger.debug(f"📊 [call_model] 开始调用大模型")
    logger.debug(f"{'='*60}")
    
    # ========== 1. 获取完整历史 ==========
    full_messages = state.get("messages", [])
    logger.debug(f"📊 从 state 获取 messages: {len(full_messages)} 条")
    
    # 🔍 打印 state 中的消息结构
    for i, msg in enumerate(full_messages):
        msg_type = type(msg).__name__
        if isinstance(msg, AIMessage):
            tool_calls = getattr(msg, "tool_calls", [])
            logger.debug(f"   state[{i}] {msg_type}: tool_calls={len(tool_calls)}, content_len={len(str(msg.content)) if msg.content else 0}")
        elif isinstance(msg, ToolMessage):
            logger.debug(f"   state[{i}] {msg_type}: tool_call_id={getattr(msg, 'tool_call_id', '无ID')}")
        else:
            logger.debug(f"   state[{i}] {msg_type}")
    
    # 深拷贝
    full_messages = copy.deepcopy(full_messages)
    logger.debug(f"📊 深拷贝后消息数: {len(full_messages)}")
    
    # 检查中断
    thread_id = state.get("thread_id", "default")
    check_interrupt(thread_id)
    
    # ========== 2. 检查是否需要压缩 ==========
    context_messages = full_messages
    
    # 判断是否需要重新压缩
    need_compress = False
    
    # 条件1：context 为空
    if not context_messages:
        need_compress = True
        logger.debug("📊 上下文为空，需要压缩")
    
    # 条件2：完整历史变化较大（新增了消息）
    if not need_compress and full_messages:
        # 获取完整历史最后几条消息
        full_last = full_messages[-5:] if len(full_messages) >= 5 else full_messages
        context_last = context_messages[-5:] if len(context_messages) >= 5 else context_messages
        
        # 简单判断：如果完整历史最后5条和 context 最后5条不同，说明有新消息
        if len(full_last) != len(context_last):
            need_compress = True
        else:
            # 检查内容是否一致
            for i, msg in enumerate(full_last):
                if i < len(context_last):
                    if str(msg.content) != str(context_last[i].content):
                        need_compress = True
                        break
    
    # 条件3：消息数量过多或 Token 超限
    if not need_compress and full_messages:
        token_count = count_messages_tokens(full_messages)
        if len(full_messages) > 100 or token_count > 800000:
            need_compress = True
            logger.debug(f"📊 消息过多或 Token 超限: {len(full_messages)} 条, {token_count} tokens")
    
    # ========== 3. 压缩生成上下文 ==========
    if need_compress and full_messages:
        # 先修复消息
        repaired_messages = full_messages
        
        # 压缩
        compressed_messages, compression_info = compress_with_filter(
            repaired_messages,
            system_prompt=SYSTEM_PROMPT,
            target_tokens=800000
        )
        
        # 打印压缩信息
        logger.debug(f"\n📊 上下文压缩信息:")
        logger.debug(f"   原始: {compression_info.get('original_count', 0)} 条, {compression_info.get('original_tokens', 0)} tokens")
        logger.debug(f"   压缩后: {compression_info.get('compressed_count', 0)} 条, {compression_info.get('compressed_tokens', 0)} tokens")
        logger.debug(f"   压缩率: {compression_info.get('compression_ratio', '0%')}")
        logger.debug(f"   过滤: {compression_info.get('filtered_count', 0)} 条异常消息")
        
        if compression_info.get('status') == 'compressed':
            log_compression(
                logger,
                compression_info.get('original_count', 0),
                compression_info.get('compressed_count', 0),
                compression_info.get('original_tokens', 0),
                compression_info.get('compressed_tokens', 0)
            )
        
        context_messages = compressed_messages
        
        # ✅ 过滤不完整的对话组（整组删除）
        context_messages = context_messages
        
    elif not context_messages and full_messages:
        # 如果没有 context 但有 full_messages，直接使用 full_messages（无压缩）
        context_messages = full_messages
        logger.debug(f"📊 使用完整历史: {len(context_messages)} 条消息")
    elif context_messages:
        logger.debug(f"📊 使用已有上下文: {len(context_messages)} 条消息")

    # ========== 4. 修复消息确保顺序 User [-> Assistant -> Tool]  -> Assistant ==========
    logger.debug(f"📊 [修复前] context_messages 数量: {len(context_messages)}")
    context_messages = check_and_fix_messages(context_messages)
    logger.debug(f"📊 [修复后] context_messages 数量: {len(context_messages)}")

    for msg in context_messages:
        if isinstance(msg, AIMessage):
            if hasattr(msg, "additional_kwargs"):
                msg.additional_kwargs.pop("reasoning_content", None)

    # ========== 4. 确保 SystemMessage 存在 ==========
    if not context_messages or not isinstance(context_messages[0], SystemMessage):
        context_messages = [SystemMessage(content=SYSTEM_PROMPT)] + context_messages
        logger.debug(f"📊 注入 SystemMessage，现在共 {len(context_messages)} 条")
    
    # 🔍 打印最终发送给 LLM 的消息结构
    logger.debug(f"\n📋 [最终发送给 LLM 的消息结构] 共 {len(context_messages)} 条")
    for i, msg in enumerate(context_messages):
        msg_type = type(msg).__name__
        content_preview = get_content_preview(msg)
        if isinstance(msg, AIMessage):
            tool_calls = getattr(msg, "tool_calls", [])
            logger.debug(f"   [{i}] {msg_type}: content='{content_preview}', tool_calls={len(tool_calls)}")
            if tool_calls:
                for tc in tool_calls:
                    logger.debug(f"      - {tc.get('name')} (id={tc.get('id')})")
            if hasattr(msg, "additional_kwargs") and msg.additional_kwargs:
                logger.debug(f"      - additional_kwargs: {msg.additional_kwargs}")
        elif isinstance(msg, ToolMessage):
            tc_id = getattr(msg, "tool_call_id", "无ID")
            logger.debug(f"   [{i}] {msg_type}: tool_call_id={tc_id}, content='{content_preview}'")
        elif isinstance(msg, HumanMessage):
            logger.debug(f"   [{i}] {msg_type}: content='{content_preview}'")
        elif isinstance(msg, SystemMessage):
            logger.debug(f"   [{i}] {msg_type}: content='{content_preview}'")
        else:
            logger.debug(f"   [{i}] {msg_type}")
    
    # ========== 5. 调用模型 ==========
    # model = create_pro_model()
    # 打印线程和事件循环
    try:
        loop = asyncio.get_running_loop()
        logger.debug(f"🔍 [DEBUG] call_model 有运行中的 loop: {id(loop)}")
    except RuntimeError:
        logger.debug(f"🔍 [DEBUG] call_model 没有运行中的 loop（同步线程里）")

    logger.debug(f"🔍 [DEBUG] call_model 线程: {threading.current_thread().name}")
    agent = createAgent()
    
    log_api_request(logger, context_messages)
    
    start_time = time.time()
    
    try:


        logger.info(f"📊 开始请求大模型，context messages={len(context_messages)}")

        logger.debug(f"🔍 [DEBUG] rag_agent 类型: {type(agent).__name__}")
        logger.debug(f"🔍 [DEBUG] rag_agent 的 checkpointer: {getattr(agent, 'checkpointer', 'N/A')}")

        # 检查 agent 内部的图节点
        if hasattr(agent, 'get_graph'):
            graph = agent.get_graph()
            logger.debug(f"🔍 [DEBUG] rag_agent 图的节点: {[n for n in graph.nodes.keys()]}")

        logger.debug(f"🔍 [DEBUG] 即将调用 agent.invoke")
        # response = model.invoke(context_messages)
        result = agent.invoke({"messages":context_messages})

        logger.debug(f"🔍 [DEBUG] agent.invoke 返回，类型: {type(result).__name__}, keys: {result.keys() if isinstance(result, dict) else 'N/A'}")
        # for message in result["messages"]:
        #     message.pretty_print()

        new_messages = []
        lastMessageId = context_messages[-1].id
        # 找到id=lastMessageId之后的消息并添加到new_messages
        isNewMessage = False
        # for i, msg in enumerate(context_messages) :
        #     logger.debug(f"[debug] call_model old message {i} id = {msg.id}")
        for i, msg in enumerate(result["messages"]):
            ai_message_temp = convert_to_meta_message(msg)
            # logger.debug(f"[debug] call_model mew message {i} id = {ai_message_temp.id}")
            if isNewMessage:
                new_messages.append(ai_message_temp)
            if (lastMessageId is not None) and (ai_message_temp.id == lastMessageId):
                isNewMessage = True

        
        logger.debug(f"📊 结束请求大模型，context message {len(result["messages"])}")
        logger.debug(f"📊 结束请求大模型，新增消息 {len(new_messages)}")
        if len(new_messages) == 0:
            return {}
        response = new_messages[-1]
        
        # 提取 token 使用信息
        token_usage = {}
        if hasattr(response, "usage_metadata") and response.usage_metadata:
            token_usage = {
                "prompt_tokens": response.usage_metadata.get("input_tokens", 0),
                "completion_tokens": response.usage_metadata.get("output_tokens", 0),
                "total_tokens": response.usage_metadata.get("total_tokens", 0),
            }
        elif hasattr(response, "response_metadata") and response.response_metadata:
            usage = response.response_metadata.get("token_usage", {})
            if usage:
                token_usage = {
                    "prompt_tokens": usage.get("prompt_tokens", 0),
                    "completion_tokens": usage.get("completion_tokens", 0),
                    "total_tokens": usage.get("total_tokens", 0)
                }
        
        duration_ms = (time.time() - start_time) * 1000
        log_api_response(logger, response, duration_ms)
        
        # 添加 token 信息到响应
        ai_message = convert_to_meta_message(response)
        if hasattr(ai_message, "additional_kwargs"):
            ai_message.additional_kwargs["token_usage"] = token_usage
        else:
            ai_message.additional_kwargs = {"token_usage": token_usage}
        
        # ========== 6. 更新上下文 ==========
        # 将新响应追加到压缩上下文中，供下一轮使用
        updated_context = context_messages + [ai_message]

        tool_calls = getattr(ai_message, "tool_calls", [])
        logger.debug(f"   [new ai msg] {msg_type}: content='{get_content_preview(ai_message)}', tool_calls={len(tool_calls)}")
        if tool_calls:
            for tc in tool_calls:
                logger.debug(f"      - {tc.get('name')} (id={tc.get('id')})")
        if hasattr(ai_message, "additional_kwargs") and ai_message.additional_kwargs:
            logger.debug(f"      - additional_kwargs: {ai_message.additional_kwargs}")

        logger.debug(f"📊 结束call model, updated context={len(updated_context)}")

        # ========== 7. 返回 ==========
        return {
            "messages": new_messages
        }
        
    except Exception as e:
        traceback.print_exc()
        error_msg = str(e)
        logger.debug(f"\n❌ [call_model] 捕获异常: {error_msg}")
        logger.debug(f"❌ 异常类型: {type(e).__name__}")
        
        # 🔍 打印异常发生时的 context_messages 结构，帮助诊断
        logger.debug(f"\n📋 [异常发生时 context_messages 结构]")
        for i, msg in enumerate(context_messages):
            msg_type = type(msg).__name__
            if isinstance(msg, AIMessage):
                tool_calls = getattr(msg, "tool_calls", [])
                logger.debug(f"   [{i}] {msg_type}: tool_calls={len(tool_calls)}")
                if tool_calls:
                    for tc in tool_calls:
                        logger.debug(f"      - {tc.get('name')} (id={tc.get('id')})")
            elif isinstance(msg, ToolMessage):
                logger.debug(f"   [{i}] {msg_type}: tool_call_id={getattr(msg, 'tool_call_id', '无ID')}")
            else:
                logger.debug(f"   [{i}] {msg_type}")
        
        log_error(logger, error_msg, "调用模型")
        friendly_error_message = error_msg
        # 处理各种错误
        if "tool_calls" in error_msg.lower() and "tool messages" in error_msg.lower():
            logger.debug("⚠️ tool_calls 错误，返回友好提示")
            friendly_error_message = f"❌ 工具调用错误，请重试：{str(error_msg)}"
        elif "context_length" in error_msg.lower() or "maximum context" in error_msg.lower():
            logger.debug("⚠️ 上下文超限错误")
            friendly_error_message = f"❌ 上下文超限，请重置会话：{str(error_msg)}"
        elif "auth" in error_msg.lower() or "401" in error_msg:
            friendly_error_message = f"❌ API Key 认证失败：{str(error_msg)}"
        elif "rate" in error_msg.lower() or "429" in error_msg:
            friendly_error_message = f"⏳ API 请求太频繁：{str(error_msg)}"
        else:
            friendly_error_message = f"❌ 调用模型时出错：{str(error_msg)}"
            logger.debug(f"Error calling model: {error_msg}")
        
        return {
            "messages": [AIMessage(content=friendly_error_message,
                additional_kwargs={
                    "error_type": "system_error",        # 错误类型
                    "is_system_message": True,            # 标识是系统生成的
                    "timestamp": time.time()              # 可选：记录时间
                })]
        }
    finally:
        logger.debug(f"\n{'*'*60}end{'-'*60}end{'*'*60}")


def route_tools(state: AgentState) -> str:
    """路由到工具或结束，基于压缩上下文判断"""

    logger.debug(f"📊 开始路由工具")

    # ✅ 优先使用 context（AI 实际使用的消息）
    context_messages = state.get("messages", [])
    logger.debug(f"📊 context_messages 数量: {len(context_messages)}")
    
    if not context_messages:
        return END
    
    last_message = context_messages[-1]
    
    # ========== 检查是否有 tool_calls ==========
    if hasattr(last_message, "tool_calls") and last_message.tool_calls:
        # 检查连续工具调用次数（防止死循环）
        tool_call_count = 0
        for msg in reversed(context_messages):
            if hasattr(msg, "tool_calls") and msg.tool_calls:
                tool_call_count += 1
            else:
                break
            
            # 如果连续工具调用超过 8 次，强制结束
            if tool_call_count > 8:
                logger.debug(f"⚠️ 连续工具调用次数过多 ({tool_call_count})，强制结束")

                # ✅ 关键修复：清除最后一条消息的 tool_calls
                if hasattr(last_message, "tool_calls"):
                    logger.debug(f"   🧹 已清除 AIMessage 的 tool_calls {last_message.tool_calls}")
                    last_message.tool_calls = []

                return END
        
        logger.debug(f"🔧 路由到 tools 节点 (连续调用次数: {tool_call_count})")
        return "tools"

    logger.debug("🔧 路由到 end 节点")
    return END


def execute_tools(state: AgentState) -> AgentState:
    """执行工具节点"""
    
    # ✅ 优先使用 context
    logger.debug(f"\n{'='*60}")
    logger.debug(f"📊 [execute_tools] 开始执行工具")
    logger.debug(f"{'='*60}")
    
    context_messages = state.get("messages", [])
    logger.debug(f"📊 context_messages 数量: {len(context_messages)}")

    # 打印调试信息
    ai_message = context_messages[-1] if context_messages else None
    tool_calls = getattr(ai_message, "tool_calls", [])
    msg_type = type(ai_message).__name__
    logger.debug(f"   [last ai msg] {msg_type}: content='{get_content_preview(ai_message)}', tool_calls={len(tool_calls)}")
    if tool_calls:
        for tc in tool_calls:
            logger.debug(f"      - {tc.get('name')} (id={tc.get('id')})")
    if hasattr(ai_message, "additional_kwargs") and ai_message.additional_kwargs:
        logger.debug(f"      - additional_kwargs: {ai_message.additional_kwargs}")
    
    # 找到最后一个带 tool_calls 的 AIMessage
    last_ai_msg = None
    last_ai_idx = -1
    for idx, msg in enumerate(reversed(context_messages)):
        if isinstance(msg, AIMessage) and hasattr(msg, "tool_calls") and msg.tool_calls:
            last_ai_msg = msg
            last_ai_idx = len(context_messages) - 1 - idx
            break
    
    if not last_ai_msg:
        logger.debug("⚠️ execute_tools: 没有找到带 tool_calls 的 AIMessage")
        return {"messages": []}
    
    logger.debug(f"📊 找到 AIMessage 在索引 {last_ai_idx}，tool_calls={len(last_ai_msg.tool_calls)}")
    for tc in last_ai_msg.tool_calls:
        logger.debug(f"   - {tc.get('name')} (id={tc.get('id')})")
    
    # 检查是否已经有对应的 ToolMessage
    has_tool_response = False
    for msg in context_messages:
        if isinstance(msg, ToolMessage):
            for tc in last_ai_msg.tool_calls:
                if hasattr(msg, "tool_call_id") and msg.tool_call_id == tc.get("id"):
                    has_tool_response = True
                    logger.debug(f"  ✅ 已存在 ToolMessage 对应 tool_call_id={tc.get('id')}")
                    break
            if has_tool_response:
                break
    
    if has_tool_response:
        logger.debug("⚠️ execute_tools: 已经有对应的 ToolMessage，跳过执行")
        return {"messages": []}
    
    # ========== 执行工具 ==========
    tool_messages = []
    for tool_call in last_ai_msg.tool_calls:
        tool_name = tool_call.get("name", "unknown")
        tool_args = tool_call.get("args", {})
        tool_call_id = tool_call.get("id")
        
        logger.debug(f"🔧 执行工具: {tool_name}, id={tool_call_id}")
        
        if not tool_call_id:
            logger.debug(f"⚠️ 工具 {tool_name} 缺少 tool_call_id，跳过")
            continue
        
        try:
            tool_found = False
            for tool in getTools():
                if tool.name == tool_name:
                    tool_found = True
                    try:
                        result = tool.invoke(tool_args)
                        log_tool_result(logger, tool_name, tool_args, result)
                        logger.debug(f"  ✅ 工具执行成功，结果长度: {len(str(result))}")
                    except Exception as e:
                        result = f"工具执行出错：{str(e)}"
                        log_error(logger, str(e), f"执行工具 {tool_name}")
                        logger.debug(f"  ❌ 工具执行出错: {e}")
                    break
            if not tool_found:
                result = f"未找到工具: {tool_name}"
                logger.debug(f"  ❌ 未找到工具: {tool_name}")
        except Exception as e:
            result = f"执行工具时出错：{str(e)}"
            logger.debug(f"  ❌ 执行工具时出错: {e}")
        
        tool_messages.append(
            ToolMessage(content=result, tool_call_id=tool_call_id)
        )
        logger.debug(f"  📝 创建 ToolMessage: tool_call_id={tool_call_id}")
    
    logger.debug(f"✅ execute_tools 返回 {len(tool_messages)} 个 ToolMessage")
    for tm in tool_messages:
        logger.debug(f"   - tool_call_id={getattr(tm, 'tool_call_id', '无ID')}, content_len={len(str(tm.content))}")

    return {
        "messages": tool_messages
    }

# workflow/nodes.py

def skill_router_node(state: dict) -> dict:
    """
    技能路由节点：根据用户输入，LLM决定调用哪个技能
    这个节点类似你的工具选择节点，但候选列表更精简
    """
    user_input = state["messages"][-1].content
    
    # 1. 获取技能注册表（只含名称+描述+入口参数）
    skills_info = skill_registry.get_skills_for_llm()
    
    # 2. 让LLM从技能列表中选择一个（只选，不执行）
    llm_response = call_llm(
        system_prompt=f"从以下技能中选择一个，输出JSON: {{'skill_name': ..., 'params': ...}}\n{skills_info}",
        user_message=user_input
    )
    
    # 3. 解析LLM的选择结果
    selected = json.loads(llm_response)
    state["selected_skill"] = selected["skill_name"]
    state["skill_params"] = selected["params"]
    
    return state


def skill_executor_node(state: dict) -> dict:
    """
    技能执行节点：执行被选中的技能
    这个节点内部会调用技能的子图逻辑
    """
    skill_name = state["selected_skill"]
    params = state["skill_params"]
    
    # 执行技能（内部会串行调用多个工具）
    result = skill_registry.execute(skill_name, params)
    
    state["messages"].append({"role": "assistant", "content": result})
    return state

def get_agent_step_limit() -> int:
    """获取智能体递归调用的最大步数"""
    return int(os.getenv("AGENT_RECURSION_LIMIT", "150"))

# agent_core.py 新增异步流式方法

async def stream_agent(
    messages: list[Any], 
    config: Dict[str, Any],
    session_id: str = "default"
)-> AsyncGenerator[Dict[str, Any], None]:
    """流式执行 agent，yield 事件"""
    
    app = await create_async_agent()

    # 获取 thread_id
    thread_id = config.get("configurable", {}).get("thread_id", session_id)

    tool_calls_buffer = []
    step_count = 0
    inner_step_count = 0
    limit = get_agent_step_limit()
    tool_calls = []

    app_run_id = None
    call_model_run_id = None  # ✅ 外层图 agent 节点的 run_id
    inner_run_ids = set()     # ✅ 所有"以 call_model_run_id 为祖先"的 run_id

    context = {
        
    }

    from collections import deque
    pending_calls = deque()      # 待执行的 tool_calls（来自决策）
    runid_to_call = {}           # tool run_id -> {tool_call_id, name, args}
    
    # 使用 astream_events 捕获执行过程
    async for event in app.astream_events(
        {"messages": messages},
        config=config,
        version="v2"
    ):
        event_type = event.get("event")
        data = event.get("data", {})
        event_name = name = event.get("name", "")
        run_id = event.get("run_id")
        parent_ids = event.get("parent_ids", [])
        # logger.debug(f"node {name} : {" -> ".join(parent_ids+[run_id]) if parent_ids else run_id}")

        # ============ 建立基础信息 ============
        
        # 第一次事件，记录 app 根 run_id
        if app_run_id is None:
            app_run_id = run_id
        # 判断是否是外层图的直接节点
        is_outer_direct_node = (len(parent_ids) == 1 and parent_ids[0] == app_run_id)
        
        # 识别 call_model 节点（外层图 agent 节点的 on_chain_start）
        if (event_type == "on_chain_start" 
            and event_name == "agent" 
            and is_outer_direct_node
            and app_run_id in parent_ids
            and call_model_run_id is None):
            call_model_run_id = run_id
            logger.debug(f"🔍 call_model 节点 run_id: {call_model_run_id}")
        
        # ============ 判断事件属于哪层 ============
         # 判断是否外层图节点的直接事件
        is_outer_node = (
            app_run_id == run_id
            or (len(parent_ids) == 1 and parent_ids[0] == app_run_id)
        )
        
        is_inner_event = False
        
        if call_model_run_id:
            # 内层事件：parent_ids 里包含 call_model_run_id
            if call_model_run_id in parent_ids:
                is_inner_event = True
                # 记录这个内层 run_id，方便后续判断
                inner_run_ids.add(run_id)
            # 也检查是否以已知内层 run_id 为祖先
            elif any(pid in inner_run_ids for pid in parent_ids):
                is_inner_event = True
                inner_run_ids.add(run_id)

        if event.get("event") == "on_chain_start" and is_inner_event:
            inner_step_count += 1
            logger.debug(f"📊 inner Agent 执行步骤 {inner_step_count}/{limit} {event_name} start")

        if event.get("event") == "on_chain_start" and is_outer_node:
            step_count += 1
            logger.debug(f"📊 outer Agent 执行步骤 {step_count}/{limit} {event_name} start")

        if event.get("event") == "on_chain_end" and is_inner_event:
            logger.debug(f"📊 inner Agent 执行步骤 {inner_step_count}/{limit} {event_name} end")
        
        if event.get("event") == "on_chain_end" and is_outer_node:
            logger.debug(f"📊 outer Agent 执行步骤 {step_count}/{limit} {event_name} end")

        # logger.debug(f"📡 流式事件: {event_type}, name={name}, data keys={list(data.keys())}")
        if event_type and event_type not in ["on_chat_model_stream", "on_chain_stream"]:
            logger.info(f"processing {event_type} for node {name}")
        
        # ===== 工具执行事件 =====
        if event_type == "on_tool_start":
            call = pending_calls.popleft() if pending_calls else None
            if call:
                runid_to_call[run_id] = call

            for sub in  agent_eventhandler.handler_tool(data, {'name':name, 'tool_calls':tool_calls}, tool_calls_buffer):
                sub['type']= 'tool_start'
                sub["tool_call_id"] = call["tool_call_id"] if call else None
                sub["id"] = call["tool_call_id"] if call else None
                sub["run_id"] =  run_id
                yield sub
            logger.info("🔧 Tools 节点开始")
        
        elif event_type == "on_tool_end":
            logger.info("🔧 Tools 节点结束")
            output = data.get("output")
            result = ""
            current_tool_call = None
            call = runid_to_call.pop(run_id, None)
            if call:
                tool_call_id = call["tool_call_id"] if call else None
                tool_name = call["name"] if call else name
                tool_calls_args = call["args"] if call else name
                logger.debug(f"📡 工具结束: {tool_name}, id={tool_call_id}")
                # dict 类型
                if isinstance(output, dict):
                    result = output.get('output','')
                if isinstance(output, str):
                    result = output
                if isinstance(output, ToolMessage):
                    result = output.content
                yield {
                    "type": "tool_end",
                    "tool": name,
                    "args":tool_calls_args,
                    "tool_call_id": tool_call_id,
                    "result": output.content,
                    "output":result,
                    "full_result_length": len(str(result or output)),
                    "timestamp": time.time(),
                    "tool_calls": [call]
                }
            else:
                logger.error(f"Not found runing call {name} in runid_to_call")
        elif event_type == "on_tool_error":
            current_tool_call = None
            for tc in tool_calls:
                if tc.get("name") == name:
                    current_tool_call = tc
                    break
            tool_call_id = None
            tool_calls_args = None
            if current_tool_call:
                logger.debug(f"📡 工具开始: {name}, id={current_tool_call.get('id')}")
                tool_call_id = current_tool_call.get("id")
                tool_calls_args = current_tool_call.get("args")

            yield {
                "type": "tool_error",
                "tool": name,
                "id": tool_call_id,
                "tool_call_id": tool_call_id,
                "error": str(data.get("error", "")),
                "timestamp": time.time()
            }
        
        # ===== AI 流式输出事件 =====
        elif event_type == "on_chat_model_stream":
            for sub in agent_eventhandler.handler_chat_model_stream(data, {'name':name, 'tool_calls_buffer':tool_calls_buffer}, tool_calls_buffer):
                yield sub
            
        elif event_type == "on_chat_model_end":
            logger.debug(f' the data ={data.get('output',{})}')
            output = data.get('output',{})
            if isinstance(output, BaseMessage):
                tool_calls = getattr(output, 'tool_calls')
                if (tool_calls):
                    # ✅ 流式结束时，发送所有累积的 tool_calls
                    for tc in tool_calls:
                        if not tc.get("id"):        # 跳过空壳分片
                            continue
                        pending_calls.append({
                            "tool_call_id": tc["id"],
                            "name": tc["name"],
                            "args": tc.get("args", {}),
                        })
                    yield {
                        "type": "chat_mode_end",
                        "tool_calls": tool_calls,
                        "timestamp": time.time(),
                        "nod_name":f"node {name} : {" -> ".join(parent_ids+[run_id]) if parent_ids else run_id}"
                    }
                
        # ===== 思考内容（DeepSeek reasoning） =====
        elif event_type == "on_chat_model_start":
            # 某些模型支持 reasoning_content，在 additional_kwargs 中
            tool_calls_buffer = []  # 清空
            pass

        # ===== 节点完成事件 =====
        elif event_type == "on_chain_start":
            for sub in  agent_eventhandler.handler_chain_start(data, {'name':name}, tool_calls_buffer):
                yield sub
            logger.info("🔧 on_chain_start 节点完成")
        
        elif event_type == "on_chain_stream":
            # 处理流式输出
            chunk = data.get("chunk", {})
            
            # 如果包含 tool_calls
            if hasattr(chunk, "tool_calls") and chunk.tool_calls:
                for tc in chunk.tool_calls:
                    if tc.get("name"):  # 只保留有 name 的
                        tool_calls_buffer.append({
                            "name": tc.get("name"),
                            "args": tc.get("args", {}),
                            "id": tc.get("id")
                        })
                yield {
                        "type": "chain_stream",
                        "timestamp": time.time(),
                        "tool_calls_buffer":tool_calls_buffer
                    }
        elif event_type == "on_chain_end":
            for sub in  agent_eventhandler.handler_chain_end(data, {'name':name, 'tool_calls_buffer':tool_calls_buffer}, tool_calls_buffer):
                yield sub
            logger.info("🔧 chain 节点完成")
            if name == "LangGraph":
                yield {
                    "type": "graph_end",
                    "timestamp": time.time()
                }
        
        # ===== 图完成事件 =====
        elif event_type == "on_graph_end":
            yield {
                "type": "graph_end",
                "timestamp": time.time()
            }
            logger.info("✅ 图执行完成")

        # ===== 错误事件 =====
        elif event_type == "on_error":
            error = str(data.get("error", "未知错误"))
            yield {
                "type": "error",
                "error": str(data.get("error", "未知错误")),
                "timestamp": time.time()
            }
            logger.error(f"❌ 执行错误: {error}")

        else:
            yield {
                "type": "unknown_event",
                "event_type": event_type,
                "data_keys": list(data.keys()),
                "timestamp": time.time()
            }
            logger.warning(f"⚠️ 未知事件类型: {event_type}, name={name}, data keys={list(data.keys())}")

def formatMessage(msg):
    """将消息对象格式化为字典，便于日志记录和调试"""
    try:
        msg = convert_to_meta_message(msg)  # 确保是 MetaMessage
    except Exception as e:
        logger.error(f"❌ 格式化消息时出错: {e}")
        pass
    
    msg_type = msg.__class__.__name__
    if isinstance(msg, HumanMessage):
        role = "user"
    elif isinstance(msg, AIMessage):
        role = "assistant"
    elif isinstance(msg, ToolMessage):
        role = "tool"
    else:
        role = msg.type if hasattr(msg, "type") else msg_type.lower()
    msg_id = getattr(msg, "id", None)
    
    entry = {
        "role": role,
        "content": getattr(msg, "content", ""),
        "type": msg_type,
        "id": msg_id,
        "msg": msg
    }
    
    if isinstance(msg, AIMessage):
        if hasattr(msg, "additional_kwargs"):
            thinking = msg.additional_kwargs.get("reasoning_content", "")
            if thinking:
                entry["thinking"] = thinking
        if hasattr(msg, "tool_calls") and msg.tool_calls:
            entry["tool_calls"] = [
                {"name": tc.get("name", "unknown"), "args": tc.get("args", {}), "id": tc.get("id")}
                for tc in msg.tool_calls
            ]
    
    if isinstance(msg, ToolMessage) and hasattr(msg, "tool_call_id"):
        entry["tool_call_id"] = msg.tool_call_id
        if hasattr(msg, "name"):
            entry["name"] = msg.name
        if hasattr(msg, "id"):
            entry["id"] = msg.id
        if hasattr(msg, "additional_kwargs"):
            entry["additional_kwargs"] = msg.additional_kwargs
    
    return entry

# ============ 创建智能体实例 ============
def create_agent():
    workflow = StateGraph(AgentState)
    
    workflow.add_node("agent", call_model)
    workflow.add_node("tools", execute_tools)
    
    workflow.set_entry_point("agent")
    
    workflow.add_conditional_edges("agent", route_tools, {"tools": "tools", END: END})
    workflow.add_edge("tools", "agent")
    
    DB_PATH = os.path.join(os.path.dirname(__file__), "agent_memory.db")
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    memory = SqliteSaver(conn)
    
    recursion_limit = get_agent_step_limit()
    app = workflow.compile(checkpointer=memory).with_config({"recursion_limit": recursion_limit})
    
    return app

async def create_async_agent():
    """创建异步智能体实例"""
    workflow = StateGraph(AgentState)

    # 用子图替换原来的call_model节点
    llm_subgraph = create_llm_subgraph()
    workflow.add_node("call_model", llm_subgraph)  # 子图作为一个节点
    
    workflow.add_node("agent", call_model)
    workflow.add_node("tools", execute_tools)
    # 添加节点
    workflow.add_node("sanitize", sanitize_input)
    workflow.add_node("retrieve", retrieve_knowledge)      # 新增
    workflow.add_node("build", build_messages_with_knowledge)  # 新增
    workflow.add_node("load_history", load_and_compress_history)  # 新增
    workflow.add_node("validate", validate_response)  # 新增
    workflow.add_node("error_handler", handle_error)  # 新增
    
    # workflow.set_entry_point("agent")
    # 改起点
    workflow.set_entry_point("sanitize")
    # workflow.add_edge("sanitize", "agent")  # 清洗完进agent
    workflow.add_edge("sanitize", "load_history")
    workflow.add_edge("load_history", "retrieve")
    # workflow.add_edge("sanitize", "retrieve")
    workflow.add_edge("retrieve", "build")
    workflow.add_edge("build", "agent")
    #workflow.add_edge("agent", "validate")  # agent先过校验

    # 改为：agent → route_tools → tools 或 validate
    workflow.add_conditional_edges(
        "agent",
        route_tools,
        {
            "tools": "tools",
            "validate": "validate",  # 没有 tool_calls 时去 validate
            END: END
        }
    )

    # 校验后的条件边
    workflow.add_conditional_edges(
        "validate",
        route_after_validation,
        {
            "tools": "tools",
            "error_handler": "error_handler",
            END: END,
            "__default__": END
        }
    )

    #workflow.add_conditional_edges("agent", route_tools, {"tools": "tools", END: END})
    workflow.add_edge("tools", "agent")
    workflow.add_edge("error_handler", END)  # 错误后结束（或回到agent重试）
    
    DB_PATH = os.path.join(os.path.dirname(__file__), "agent_memory.db")
    
    # ✅ 使用异步 SqliteSaver
    conn = await aiosqlite.connect(DB_PATH)
    memory = AsyncSqliteSaver(conn, serde=JsonPlusSerializer())
    
    recursion_limit = get_agent_step_limit()
    app = workflow.compile(checkpointer=memory).with_config({"recursion_limit": recursion_limit})
    
    return app

# === 2. 创建子图（替代原来的call_model逻辑） ===
def create_llm_subgraph():
    workflow = StateGraph(AgentState)
    
    # 添加所有节点
    workflow.add_node("load_history", load_history)
    workflow.add_node("check_interrupt", flow_check_interrupt)
    workflow.add_node("fix_tool_calls", fix_tool_calls)
    workflow.add_node("compress", compress_messages)
    workflow.add_node("filter_groups", filter_groups)
    workflow.add_node("ensure_system", ensure_system)
    workflow.add_node("call_llm", call_llm)
    workflow.add_node("process_response", process_response)
    #workflow.add_node("handle_llm_error", handle_llm_error)
    
    # 设置入口
    workflow.set_entry_point("load_history")
    
    # 顺序执行链
    workflow.add_edge("load_history", "check_interrupt")
    workflow.add_edge("check_interrupt", "fix_tool_calls")
    
    # 条件边：判断是否需要压缩
    workflow.add_conditional_edges(
        "fix_tool_calls",
        should_compress,
        {
            "compress": "compress",
            "skip_compress": "ensure_system"
        }
    )
    
    # 压缩链
    workflow.add_edge("compress", "filter_groups")
    workflow.add_edge("filter_groups", "ensure_system")
    
    # 调用模型（用try-catch包裹异常）
    workflow.add_edge("ensure_system", "call_llm")
    
    # call_llm可能抛出异常，用条件边处理
    # 但LangGraph的异常处理更推荐用try-catch包裹节点函数
    # 这里我们直接用普通边，在process_response里处理正常情况
    # 异常会向上抛出，由外层图捕获
    
    workflow.add_edge("call_llm", "process_response")
    workflow.add_edge("process_response", END)
    
    # 错误处理（由外层图中的条件边路由到这里）
    #workflow.add_edge("handle_llm_error", END)
    
    return workflow.compile()

# === 新增：输入清洗节点 ===
def sanitize_input(state):
    """清洗用户输入，防注入"""
    humanMessage = state.get("messages", [])[-1]
    logger.debug(f"📊 开始检索知识库，用户输入: {humanMessage}")
    user_input = humanMessage.content if humanMessage else ""
    
    import re
    # 移除注入尝试
    dangerous = [r"忽略.*指令", r"ignore.*instruction", r"system.*prompt", r"之前.*设定"]
    for pattern in dangerous:
        user_input = re.sub(pattern, "", user_input, flags=re.IGNORECASE)
    
    # 截断
    if len(user_input) > 2000:
        user_input = user_input[:2000] + "...(截断)"
    
    # 更新最后一条消息
    if state.get("messages"):
        humanMessage.content = str(user_input)
    return {"messages": []}

# === 新增：RAG检索节点 ===
def retrieve_knowledge(state):
    """检索知识库，结果存入state"""
    humanMessage = state.get("messages", [])[-1]
    logger.debug(f"📊 开始检索知识库，用户输入: {humanMessage}")
    user_input = humanMessage.content if humanMessage else humanMessage.content if humanMessage else ""
    
    # 简单判断是否需要检索（或通过路由节点判断）
    keywords = ["是什么", "为什么", "怎么", "如何", "定义", "原理", "介绍", "说明"]
    needs_rag = any(kw in user_input for kw in keywords)
    
    if not needs_rag:
        return {"knowledge": []}  # 不需要检索
    
    # 执行检索（复用你之前的KnowledgeBase代码）
    #from your_kb import KnowledgeBase
    #kb = KnowledgeBase()
    #docs = kb.search(user_input, top_k=3)
    docs = []

    return {"knowledge": docs}

# === 新增：消息组装节点（把知识拼进system prompt）===
def build_messages_with_knowledge(state):
    messages = state.get("messages", [])
    history = state.get("history", [])
    knowledge = state.get("knowledge", [])
    
    # 1. 构建system（含知识库）
    system_content = "你是一个智能助手。"
    if knowledge:
        knowledge_text = "\n".join([f"- {doc['content']}" for doc in knowledge[:3]])
        system_content += f"\n\n【参考资料】\n{knowledge_text}\n请严格基于以上参考资料回答。"
    
    # 2. 组装：system + 历史 + 当前问题
    new_messages = [SystemMessage(content=system_content)]
    new_messages.extend(history)

    # 加上当前问题（如果历史里已经有了就跳过）
    current = state.get("messages", [])
    if current and not any(m.content == current[-1].content for m in history):
        new_messages.append(current[-1])
    
    return {"new_messages": new_messages}

# === 新增：加载并压缩历史 ===
def load_and_compress_history(state):
    """从SQLite加载历史，压缩后注入state"""
    session_id = state.get("session_id", "default")
    
    history = []  # 正序
    
    # 估算token（粗略：1字符≈2token）
    def estimate_tokens(text):
        return len(text) * 2 if text else 0
    
    # 获取当前输入
    current_input = state.get("messages", [])[-1].content
    total = estimate_tokens(current_input) + sum(estimate_tokens(m.content) for m in history)
    
    # 如果超过阈值，压缩（保留最近10轮对话）
    MAX_TOKENS = 16000
    if total > MAX_TOKENS * 0.7 and len(history) > 20:
        # 保留最近10轮（每轮user+assistant）
        history = history[-20:] if len(history) > 20 else history
    
    # 把历史加到state中（后续build节点会用）
    return {"history": history}

# === 新增：响应校验节点 ===
def validate_response(state):
    """检查模型返回是否合法"""
    messages = state.get("messages", [])

    if not messages:
        return {"validation": "error", "error_msg": "空响应"}
    
    last = messages[-1]
    logger.debug(f"📊 校验模型响应，最后一条消息: {last}")
    if not isinstance(last, AIMessage):
        return {"validation": "error", "error_msg": "最后一条不是assistant消息"}
    
    content = last.content
    tool_calls = last.tool_calls if hasattr(last, "tool_calls") else []
    
    # 情况1：既没内容也没工具调用
    if not content and not tool_calls:
        retry_count = state.get("retry_count", 0) + 1
        if retry_count > 2:
            return {"validation": "error", "error_msg": "模型连续返回空", "retry_count": retry_count}
        # 触发重试：返回一个错误标记，让条件边走重试路径
        return {"validation": "error", "error_msg": "空响应，重试中", "retry_count": retry_count}

    logger.debug(f"📊 模型响应校验通过，内容长度: {len(content)}, 工具调用数: {len(tool_calls)}")
    # 情况2：正常
    return {"validation": "ok"}

# === 新增：错误处理节点 ===
def handle_error(state):
    """生成友好的错误回复"""
    error_msg = state.get("error_msg", "我遇到了一些问题，请重新提问。")
    return {
        "messages": [AIMessage(content=f"抱歉，{error_msg}")]
    }

# === 修改路由函数 ===
def route_after_validation(state):
    if state.get("validation") == "error":
        logger.debug(f"📊 路由到错误处理节点")
        return "error_handler"
    # 原有的工具路由逻辑
    return route_tools(state)  # 复用你原有的

def load_history(state: AgentState) -> AgentState:
    """加载并深拷贝历史消息"""
    logger.debug(f"📊 开始加载历史")
    
    full_messages = state.get("messages", [])
    full_messages = copy.deepcopy(full_messages)
    
    logger.debug(f"📊 加载了 {len(full_messages)} 条消息")
    
    return {
        "full_messages": full_messages,
        "context_messages": full_messages  # 初始上下文=完整历史
    }

def flow_check_interrupt(state: AgentState) -> AgentState:
    """检查是否被中断"""
    thread_id = state.get("thread_id", "default")
    
    # 你的中断检查逻辑
    if should_interrupt(thread_id):  # 假设你有这个函数
        raise InterruptError(f"Thread {thread_id} 被中断")
    
    return {}

def should_interrupt(thread_id: str) -> bool:
    # 你的中断检查逻辑
    return False


def fix_tool_calls(state: AgentState) -> AgentState:
    """修复消息中的tool_calls格式"""
    context_messages = state.get("context_messages", [])
    
    if context_messages:
        context_messages = check_and_fix_messages(context_messages)
        logger.debug(f"📊 修复了工具调用格式")
    
    return {"context_messages": context_messages}

def should_compress(state: AgentState) -> str:
    """
    判断是否需要压缩
    返回: "compress" 或 "skip_compress"
    """
    full_messages = state.get("full_messages", [])
    context_messages = state.get("context_messages", [])
    
    # 条件1：context为空
    if not context_messages:
        logger.debug("📊 上下文为空，需要压缩")
        return "compress"
    
    # 条件2：历史变化较大
    if full_messages and context_messages:
        full_last = full_messages[-5:] if len(full_messages) >= 5 else full_messages
        context_last = context_messages[-5:] if len(context_messages) >= 5 else context_messages
        
        if len(full_last) != len(context_last):
            logger.debug("📊 历史发生变化，需要压缩")
            return "compress"
        
        for i, msg in enumerate(full_last):
            if i < len(context_last):
                if str(msg.content) != str(context_last[i].content):
                    logger.debug("📊 内容发生变化，需要压缩")
                    return "compress"
    
    # 条件3：消息过多或Token超限
    if full_messages:
        token_count = count_messages_tokens(full_messages)
        if len(full_messages) > 100 or token_count > 800000:
            logger.debug(f"📊 Token超限: {len(full_messages)} 条, {token_count} tokens")
            return "compress"
    
    logger.debug("📊 无需压缩")
    return "skip_compress"

def compress_messages(state: AgentState) -> AgentState:
    """执行消息压缩"""
    full_messages = state.get("full_messages", [])
    
    if not full_messages:
        return {"context_messages": []}
    
    # 你的压缩逻辑
    repaired_messages = full_messages
    compressed_messages, compression_info = compress_with_filter(
        repaired_messages,
        system_prompt=SYSTEM_PROMPT,
        target_tokens=800000
    )
    
    # 打印压缩信息
    logger.debug(f"\n📊 上下文压缩信息:")
    logger.debug(f"   原始: {compression_info.get('original_count', 0)} 条, {compression_info.get('original_tokens', 0)} tokens")
    logger.debug(f"   压缩后: {compression_info.get('compressed_count', 0)} 条, {compression_info.get('compressed_tokens', 0)} tokens")
    logger.debug(f"   压缩率: {compression_info.get('compression_ratio', '0%')}")
    
    # 日志记录
    if compression_info.get('status') == 'compressed':
        log_compression(
            logger,
            compression_info.get('original_count', 0),
            compression_info.get('compressed_count', 0),
            compression_info.get('original_tokens', 0),
            compression_info.get('compressed_tokens', 0)
        )
    
    return {
        "context_messages": compressed_messages,
        "compression_info": compression_info
    }

def filter_groups(state: AgentState) -> AgentState:
    """过滤不完整的对话组"""
    context_messages = state.get("context_messages", [])
    
    if context_messages:
        context_messages = context_messages
        logger.debug(f"📊 过滤后剩余 {len(context_messages)} 条消息")
    
    return {"context_messages": context_messages}

def ensure_system(state: AgentState) -> AgentState:
    """确保SystemMessage存在"""
    context_messages = state.get("context_messages", [])
    
    # 如果压缩后为空，或第一条不是SystemMessage
    if not context_messages or not isinstance(context_messages[0], SystemMessage):
        context_messages = [SystemMessage(content=SYSTEM_PROMPT)] + context_messages
        logger.debug(f"📊 注入了System Prompt")
    
    return {"context_messages": context_messages}

def call_llm(state: AgentState) -> AgentState:
    """纯粹的LLM调用，不带任何预处理"""
    context_messages = state.get("context_messages", [])
    
    logger.debug(f"📊 开始调用大模型，共 {len(context_messages)} 条消息")
    
    # 🔍 打印发送给 LLM 的消息
    logger.debug(f"\n📋 [call_llm 发送给 LLM 的消息]")
    for i, msg in enumerate(context_messages):
        msg_type = type(msg).__name__
        if isinstance(msg, AIMessage):
            tool_calls = getattr(msg, "tool_calls", [])
            content_preview = str(msg.content)[:100] if msg.content else "(空)"
            logger.debug(f"   [{i}] {msg_type}: content='{content_preview}...', tool_calls={len(tool_calls)}")
            if tool_calls:
                for tc in tool_calls:
                    logger.debug(f"      - {tc.get('name')} (id={tc.get('id')})")
        elif isinstance(msg, ToolMessage):
            tc_id = getattr(msg, "tool_call_id", "无ID")
            content_preview = str(msg.content)[:100] if msg.content else "(空)"
            logger.debug(f"   [{i}] {msg_type}: tool_call_id={tc_id}, content='{content_preview}...'")
        else:
            content_preview = str(msg.content)[:100] if msg.content else "(空)"
            logger.debug(f"   [{i}] {msg_type}: content='{content_preview}...'")
    
    # 日志记录
    log_api_request(logger, context_messages)
    
    start_time = time.time()
    
    try:
        model = create_pro_model()
        response = model.invoke(context_messages)
        
        duration_ms = (time.time() - start_time) * 1000
        logger.debug(f"📊 大模型响应完成，耗时 {duration_ms:.0f}ms")
        
        return {
            "llm_response": response,
            "llm_start_time": start_time,
            "llm_duration_ms": duration_ms,
            "context_messages": context_messages  # 保留上下文供后续使用
        }
        
    except Exception as e:
        # 直接抛出，由错误处理节点捕获
        logger.debug(f"❌ [call_llm] 异常: {type(e).__name__}: {e}")
        raise

def process_response(state: AgentState) -> AgentState:
    """处理响应，提取token信息"""
    response = state.get("llm_response")
    context_messages = state.get("context_messages", [])

    logger.debug(f"📊 开始处理大模型响应")
    
    if not response:
        logger.debug("⚠️ 响应为空")
        return {"messages": [AIMessage(content="模型未返回响应")]}
    
    logger.debug(f"📊 响应类型: {type(response).__name__}")
    if isinstance(response, AIMessage):
        content_preview = str(response.content)[:200] if response.content else "(空)"
        logger.debug(f"📊 响应内容预览: {content_preview}...")
        tool_calls = getattr(response, "tool_calls", [])
        logger.debug(f"📊 响应 tool_calls: {len(tool_calls)}")
        if tool_calls:
            for tc in tool_calls:
                logger.debug(f"   - {tc.get('name')} (id={tc.get('id')})")
    
    # 提取token使用信息
    token_usage = {}
    if hasattr(response, "usage_metadata") and response.usage_metadata:
        token_usage = {
            "prompt_tokens": response.usage_metadata.get("input_tokens", 0),
            "completion_tokens": response.usage_metadata.get("output_tokens", 0),
            "total_tokens": response.usage_metadata.get("total_tokens", 0)
        }
    elif hasattr(response, "response_metadata") and response.response_metadata:
        usage = response.response_metadata.get("token_usage", {})
        if usage:
            token_usage = {
                "prompt_tokens": usage.get("prompt_tokens", 0),
                "completion_tokens": usage.get("completion_tokens", 0),
                "total_tokens": usage.get("total_tokens", 0)
            }
    
    # 添加token信息到响应
    ai_message = response
    if hasattr(ai_message, "additional_kwargs"):
        ai_message.additional_kwargs["token_usage"] = token_usage
    else:
        ai_message.additional_kwargs = {"token_usage": token_usage}
    
    # 日志记录
    duration_ms = state.get("llm_duration_ms", 0)
    log_api_response(logger, response, duration_ms)
    
    logger.debug(f"📊 Token使用: {token_usage}")
    logger.debug(f"📊 大模型响应处理完成")
    
    return {
        "messages": [ai_message],
        "updated_context": context_messages + [ai_message]  # 更新上下文供下轮使用
    }

def handle_llm_error(state: AgentState) -> AgentState:
    """处理LLM调用错误，生成友好回复"""
    error = state.get("_error", None)  # LangGraph会把异常注入
    error_msg = str(error) if error else "未知错误"
    logger.debug(f"📊 处理LLM调用错误: {error_msg}")
    
    logger.debug(f"❌ LLM调用错误: {error_msg}")
    log_error(logger, error_msg, "调用模型")
    
    # 分类错误
    if "tool_calls" in error_msg.lower() and "tool messages" in error_msg.lower():
        friendly_msg = f"❌ 工具调用错误，请重试：{error_msg}"
    elif "context_length" in error_msg.lower() or "maximum context" in error_msg.lower():
        friendly_msg = f"❌ 上下文超限，请重置会话：{error_msg}"
    elif "auth" in error_msg.lower() or "401" in error_msg:
        friendly_msg = f"❌ API Key 认证失败：{error_msg}"
    elif "rate" in error_msg.lower() or "429" in error_msg:
        friendly_msg = f"⏳ API 请求太频繁：{error_msg}"
    else:
        friendly_msg = f"❌ 调用模型时出错：{error_msg}"
    
    return {
        "messages": [AIMessage(
            content=friendly_msg,
            additional_kwargs={
                "error_type": "system_error",
                "is_system_message": True,
                "timestamp": time.time()
            }
        )]
    }