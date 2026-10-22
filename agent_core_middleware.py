
from langchain.agents.middleware import before_model, dynamic_prompt, ModelRequest, after_model, hook_config
from langchain.agents.middleware import before_agent, after_agent, wrap_model_call, wrap_tool_call, ModelResponse, AgentState
from langchain.agents.middleware import AgentMiddleware
from langchain.agents.middleware.types import  ToolCallRequest
from langgraph.runtime import Runtime
from typing import Any, Callable
from agent_message import (
    HumanMessageWithMeta as HumanMessage,  # 替换原生的 HumanMessage
    AIMessageWithMeta as AIMessage,        # 替换原生的 AIMessage
    ToolMessageWithMeta as ToolMessage,    # 替换原生的 ToolMessage
    SystemMessageWithMeta as SystemMessage  # 替换原生的 SystemMessage
)

import logging
logger = logging.getLogger(__name__)          # 例如 "pkg.my_module"

# https://reference.langchain.com/python/langchain/middleware
class FullHooksMiddleware(AgentMiddleware):
    """
    一个包含所有可用钩子的自定义中间件示例。
    展示了每个方法的参数、返回值以及可以执行的操作。
    """

    # --- 1. Agent 生命周期钩子 ---

    def before_agent(self, state: dict, runtime: Runtime) -> dict | None:
        """
        Agent 开始执行前调用一次。
        
        参数:
            state: 当前 Agent 状态字典，包含 'messages' 等。
            runtime: 运行时上下文，可访问 context、store 等。
        
        返回:
            dict: 用于更新 Agent 状态。
            None: 不修改状态。
        
        可以做什么:
            - 记录 Agent 启动日志
            - 验证用户输入或权限
            - 从长期记忆 (store) 中加载用户偏好
        """
        logger.debug(f"[before_agent] Agent 启动，当前消息数: {len(state.get('messages', []))}")
        # 示例：初始化一个计数器
        if "custom_counter" not in state:
            return {"custom_counter": 0}
        return None

    def after_agent(self, state: dict, runtime: Runtime) -> dict | None:
        """
        Agent 执行完成后调用一次。
        
        参数:
            state: 最终 Agent 状态。
            runtime: 运行时上下文。
        
        返回:
            dict | None: 状态更新或 None。
        
        可以做什么:
            - 保存最终对话摘要到数据库
            - 发送完成通知
            - 清理临时资源
        """
        logger.debug(f"[after_agent] Agent 执行完成，最终消息数: {len(state.get('messages', []))}")
        return None

    # --- 2. 模型调用钩子 ---

    def before_model(self, state: dict, runtime: Runtime) -> dict | None:
        """
        每次调用模型前调用，在 wrap_model_call 之前。
        
        参数:
            state: 当前状态。
            runtime: 运行时上下文。
        
        返回:
            dict: 状态更新，如 {"jump_to": "end"} 可提前终止。
            None: 不修改。
        
        可以做什么:
            - 修剪历史消息（保留最近 N 条）
            - 检查模型调用次数限制，超限则跳转到 end
            - 注入动态系统提示或上下文
        """
        # 示例：检查调用次数，超过 5 次则提前结束
        count = state.get("custom_counter", 0)
        if count > 5:
            logger.debug(f"[before_model] 调用次数超过限制 ({count})，跳转到结束")
            return {"jump_to": "end"}
        logger.debug(f"[before_model] 准备调用模型 (第 {count + 1} 次)")
        return None

    def after_model(self, state: dict, runtime: Runtime) -> dict | None:
        """
        模型返回后、工具执行前调用。
        
        参数:
            state: 包含最新 AIMessage 的状态。
            runtime: 运行时上下文。
        
        返回:
            dict: 状态更新。
            None: 不修改。
        
        可以做什么:
            - 验证模型输出是否符合规范
            - 更新计数器
            - 检测并拦截不安全内容，通过 jump_to 重新生成
        """
        last_message = state["messages"][-1]
        logger.debug(f"[after_model] 模型返回，内容预览: {str(last_message.content)[:50]}...")
        # 示例：递增计数器
        new_count = state.get("custom_counter", 0) + 1
        return {"custom_counter": new_count}

    def wrap_model_call(
        self,
        request: ModelRequest,
        handler: Callable[[ModelRequest], ModelResponse]
    ) -> ModelResponse:
        """
        包裹整个模型调用过程，是 before_model 和 after_model 之外的另一层控制。
        
        参数:
            request: 包含 state、runtime、model 等信息的请求对象。
            handler: 实际执行模型调用的处理函数。
        
        返回:
            ModelResponse: 模型调用结果。
        
        可以做什么:
            - 修改请求参数（如切换模型、修改系统提示）
            - 实现缓存逻辑，命中缓存则直接返回
            - 错误重试或降级
            - 记录详细的请求/响应日志
        """
        logger.debug(f"[wrap_model_call] 拦截模型调用")
        # 示例：在请求前打印消息数
        msg_count = len(request.state.get("messages", []))
        logger.debug(f"  请求前消息数: {msg_count}")
        
        # 调用 handler 执行实际模型调用
        response = handler(request)
        
        # 示例：在响应后记录
        # logger.debug(f"  模型响应内容: {response.content[:50]}...")

        if response.result and len(response.result) > 0:
            content = response.result[-1].content
            # content 可能是字符串，也可能是列表（多模态消息）
            if isinstance(content, str):
                logger.debug(f"  模型响应内容: {content[:50]}...")
            else:
                logger.debug(f"  模型响应内容类型: {type(content)}")

        return response

    # --- 3. 工具调用钩子 ---

    def wrap_tool_call(
        self,
        request: Any,
        handler: Callable[[Any], ToolMessage]
    ) -> ToolMessage:
        """
        包裹每次工具执行。
        
        参数:
            request: 包含 tool_call（工具名称、参数、ID）的请求对象。
            handler: 实际执行工具的处理函数。
        
        返回:
            ToolMessage: 工具执行结果。
        
        可以做什么:
            - 权限检查：拒绝未授权的工具调用
            - 参数验证或修改
            - 错误捕获，返回友好的错误 ToolMessage
            - 缓存工具结果
            - 记录审计日志
        """
        tool_name = request.tool_call.get("name", "unknown")
        tool_args = request.tool_call.get("args", {})
        logger.debug(f"[wrap_tool_call] 准备执行工具: {tool_name}, 参数: {tool_args}")
        
        try:
            # 调用 handler 执行实际工具
            result = handler(request)
            logger.debug(f"[wrap_tool_call] 工具 {tool_name} 执行成功")
            return result
        except Exception as e:
            # 示例：错误处理，返回一个友好的错误消息
            logger.debug(f"[wrap_tool_call] 工具 {tool_name} 执行失败: {e}")
            return ToolMessage(
                content=f"工具执行出错: {str(e)}",
                tool_call_id=request.tool_call.get("id", "")
            )
    async def awrap_model_call(self, request, handler):
        # 不添加任何逻辑，直接传递给下一个中间件或模型
        return await handler(request)

    async def awrap_tool_call(self, request, handler):
        return await handler(request)

    
@before_agent	#Execute logic before agent execution starts
def my_before_agent(state, runtime):
    pass


@before_model	#Execute logic before each model call
def  my_before_model(state, runtime):
    logger.debug(f"即将为用户 {runtime.context.user_name} 调用模型...")
    return None  # 返回 None 表示不修改状态

@after_model	#Execute logic after each model receives a response
def my_after_model(state, runtime):
    pass

@after_agent	#Execute logic after agent execution completes
def my_after_agent(request, handler):
    pass

@wrap_model_call	#Wrap and intercept model calls
def my_wrap_model_call(request, handler) -> ModelResponse:
    pass

@wrap_tool_call	#Wrap and intercept tool calls
def my_wrap_tool_call(request, handler) -> ToolMessage:
    pass

@dynamic_prompt	#Generate dynamic system prompts based on request context
def my_dynamic_prompt(request: ModelRequest) -> str:
     # 从运行时上下文中获取用户名
    user_name = request.runtime.context.user_name
    return f"你是一个乐于助人的助手。请称呼用户为 {user_name}。"


# --- 1. Agent 生命周期钩子 ---

@before_agent
def log_agent_start(state: AgentState, runtime: Runtime) -> dict | None:
    """
    Agent 开始执行前调用一次。
    
    可以做什么:
        - 记录 Agent 启动日志
        - 验证用户输入或权限
        - 从长期记忆 (store) 中加载用户偏好
    """
    logger.debug(f"[before_agent] Agent 启动，当前消息数: {len(state.get('messages', []))}")
    # 示例：初始化一个计数器
    return {"custom_counter": 0}


@after_agent
def log_agent_end(state: AgentState, runtime: Runtime) -> dict | None:
    """
    Agent 执行完成后调用一次。
    
    可以做什么:
        - 保存最终对话摘要到数据库
        - 发送完成通知
        - 清理临时资源
    """
    logger.debug(f"[after_agent] Agent 执行完成，最终消息数: {len(state.get('messages', []))}")
    return None


# --- 2. 模型调用钩子 ---

@before_model(can_jump_to=["end"])
def check_call_limit(state: AgentState, runtime: Runtime) -> dict | None:
    """
    每次调用模型前调用。
    
    可以做什么:
        - 修剪历史消息（保留最近 N 条）
        - 检查模型调用次数限制，超限则跳转到 end
        - 注入动态系统提示或上下文
    """
    count = state.get("custom_counter", 0)
    if count > 5:
        logger.debug(f"[before_model] 调用次数超过限制 ({count})，跳转到结束")
        return {"jump_to": "end"}  # 需要声明 can_jump_to
    logger.debug(f"[before_model] 准备调用模型 (第 {count + 1} 次)")
    return None


@after_model
def increment_counter(state: AgentState, runtime: Runtime) -> dict | None:
    """
    模型返回后、工具执行前调用。
    
    可以做什么:
        - 验证模型输出是否符合规范
        - 更新计数器
        - 检测并拦截不安全内容，通过 jump_to 重新生成
    """
    last_message = state["messages"][-1]
    logger.debug(f"[after_model] 模型返回，内容预览: {str(last_message.content)[:50]}...")
    # 示例：递增计数器
    new_count = state.get("custom_counter", 0) + 1
    return {"custom_counter": new_count}


@wrap_model_call
def intercept_model_call(request, handler):
    """
    包裹整个模型调用过程。
    
    可以做什么:
        - 修改请求参数（如切换模型、修改系统提示）
        - 实现缓存逻辑，命中缓存则直接返回
        - 错误重试或降级
        - 记录详细的请求/响应日志
    """
    logger.debug(f"[wrap_model_call] 拦截模型调用")
    msg_count = len(request.state.get("messages", []))
    logger.debug(f"  请求前消息数: {msg_count}")
    
    # 调用 handler 执行实际模型调用
    response = handler(request)
    
    logger.debug(f"  模型响应内容: {response.content[:50]}...")
    return response


# --- 3. 工具调用钩子 ---

@wrap_tool_call
def intercept_tool_call(request, handler) -> ToolMessage:
    """
    包裹每次工具执行。
    
    可以做什么:
        - 权限检查：拒绝未授权的工具调用
        - 参数验证或修改
        - 错误捕获，返回友好的错误 ToolMessage
        - 缓存工具结果
        - 记录审计日志
    """
    tool_name = request.tool_call.get("name", "unknown")
    tool_args = request.tool_call.get("args", {})
    logger.debug(f"[wrap_tool_call] 准备执行工具: {tool_name}, 参数: {tool_args}")
    
    try:
        result = handler(request)
        logger.debug(f"[wrap_tool_call] 工具 {tool_name} 执行成功")
        return result
    except Exception as e:
        logger.debug(f"[wrap_tool_call] 工具 {tool_name} 执行失败: {e}")
        return ToolMessage(
            content=f"工具执行出错: {str(e)}",
            tool_call_id=request.tool_call.get("id", "")
        )