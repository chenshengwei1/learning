import requests
import json
from typing import Dict, List, Optional, Any, Iterator, Generator, Union
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import (
    BaseMessage, AIMessage, AIMessageChunk, HumanMessage, SystemMessage, ToolMessage
)
from langchain_core.outputs import ChatResult, ChatGeneration, ChatGenerationChunk
from langchain_core.tools import BaseTool
from langchain_core.utils.function_calling import convert_to_openai_tool


# ---------------- 自定义异常 ----------------
class LLMRequestError(Exception):
    def __init__(self, name: str, status_code: int, error_code: str, message: str, request_id: str = ""):
        self.name = name
        self.status_code = status_code
        self.error_code = error_code
        self.message = message
        self.request_id = request_id
        super().__init__(f"[{name}] {error_code}: {message} | req_id:{request_id}")


# ---------------- 默认 profile ----------------
DEFAULT_PROFILE = {
    "reasoning_field": "reasoning_content",   # 响应里 reasoning 放在哪个字段
    "reasoning_policy": "optional",           # exclude | require | optional
    "token_param": "max_tokens",              # max_tokens | max_completion_tokens
    "supports_tools": True,
    "supports_stream_tools": True,
    "supports_reasoning_effort": False,
    "drop_params": [],                        # 请求前要丢弃的参数名
}


class OpenAICustomChatModel(BaseChatModel):
    url: str
    apikey: str
    model: str
    name: str
    profile: Dict[str, Any] = {}

    # ---- profile 读取辅助 ----
    def _p(self, key: str, default=None):
        if key in self.profile:
            return self.profile[key]
        return DEFAULT_PROFILE.get(key, default)

    @property
    def _llm_type(self) -> str:
        return f"custom-openai-{self.name}"

    # ============================================================
    # 一、消息归一化：dict <-> BaseMessage
    # ============================================================
    @staticmethod
    def _normalize_messages(raw_messages: List[Union[dict, BaseMessage]]) -> List[BaseMessage]:
        """统一消息：dict消息 → BaseMessage；BaseMessage直接透传"""
        output: List[BaseMessage] = []
        for msg in raw_messages:
            if isinstance(msg, BaseMessage):
                output.append(msg)
                continue
            if not isinstance(msg, dict):
                raise TypeError(f"消息类型不支持：{type(msg)}")

            role = msg.get("role")
            content = msg.get("content", "")

            if role == "user":
                output.append(HumanMessage(content=content))
            elif role == "system":
                output.append(SystemMessage(content=content))
            elif role == "assistant":
                # 保留 tool_calls / reasoning
                tool_calls = []
                for tc in msg.get("tool_calls") or []:
                    fn = tc.get("function", {})
                    args = fn.get("arguments", "{}")
                    if isinstance(args, str):
                        try:
                            args = json.loads(args)
                        except json.JSONDecodeError:
                            args = {}
                    tool_calls.append({
                        "id": tc.get("id", ""),
                        "name": fn.get("name", ""),
                        "args": args,
                    })
                additional = {}
                if msg.get("reasoning_content") is not None:
                    additional["reasoning_content"] = msg["reasoning_content"]
                output.append(AIMessage(
                    content=content,
                    tool_calls=tool_calls,
                    additional_kwargs=additional,
                ))
            elif role == "tool":
                output.append(ToolMessage(
                    content=content,
                    tool_call_id=msg.get("tool_call_id", ""),
                ))
            else:
                raise ValueError(f"不支持的role: {role}")
        return output

    # ============================================================
    # 二、BaseMessage -> OpenAI dict（保留工具与 reasoning）
    # ============================================================
    def _convert_base_messages_to_dict(self, messages: List[BaseMessage]) -> List[dict]:
        out: List[dict] = []
        policy = self._p("reasoning_policy", "optional")

        for msg in messages:
            if isinstance(msg, HumanMessage):
                out.append({"role": "user", "content": msg.content})

            elif isinstance(msg, SystemMessage):
                out.append({"role": "system", "content": msg.content})

            elif isinstance(msg, AIMessage):
                d: Dict[str, Any] = {"role": "assistant", "content": msg.content or ""}

                # 工具调用：LangChain tool_calls -> OpenAI tool_calls
                if getattr(msg, "tool_calls", None):
                    d["tool_calls"] = [
                        {
                            "id": tc["id"],
                            "type": "function",
                            "function": {
                                "name": tc["name"],
                                "arguments": tc["args"] if isinstance(tc["args"], str)
                                else json.dumps(tc["args"], ensure_ascii=False),
                            },
                        }
                        for tc in msg.tool_calls
                    ]

                # reasoning 按 policy 决定回不回传
                reasoning = (msg.additional_kwargs or {}).get("reasoning_content")
                if policy == "require":
                    # 必须回传：没有就补空串，避免 400
                    d["reasoning_content"] = reasoning if reasoning is not None else ""
                elif policy == "optional" and reasoning:
                    d["reasoning_content"] = reasoning
                # exclude: 不加

                out.append(d)

            elif isinstance(msg, ToolMessage):
                out.append({
                    "role": "tool",
                    "tool_call_id": msg.tool_call_id,
                    "content": msg.content,
                })

            else:
                out.append({"role": getattr(msg, "type", "user"), "content": msg.content})

        return out

    # ============================================================
    # 三、payload 构造：按 profile 适配不同 provider 的参数差异
    # ============================================================
    def _build_payload(self, messages: List[BaseMessage], stream: bool = False, **kwargs) -> dict:
        openai_messages = self._convert_base_messages_to_dict(messages)

        # 处理 token 参数名
        token_param = self._p("token_param", "max_tokens")
        if "max_tokens" in kwargs:
            kwargs[token_param] = kwargs.pop("max_tokens")
        if "max_completion_tokens" in kwargs and token_param != "max_completion_tokens":
            kwargs[token_param] = kwargs.pop("max_completion_tokens")

        # 丢弃不支持的参数
        for p in self._p("drop_params", []) or []:
            kwargs.pop(p, None)

        # reasoning_effort 支持性检查
        if "reasoning_effort" in kwargs and not self._p("supports_reasoning_effort", False):
            kwargs.pop("reasoning_effort")

        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": openai_messages,
            **kwargs,
        }
        if stream:
            payload["stream"] = True

        # 工具声明（来自 bind_tools 或直接传入）
        tools = payload.get("tools")
        if tools and not self._p("supports_tools", True):
            payload.pop("tools", None)
            payload.pop("tool_choice", None)

        # thinking 参数注入
        thinking_param = self._p("thinking_param")
        if thinking_param:
            thinking_value = self._p("thinking_enabled_value")
            if thinking_value:
                kwargs[thinking_param] = thinking_value

        # preserve thinking（两种方言）
        pp = self._p("preserve_thinking_param")
        if pp:
            if "preserve_thinking_false_value" in self.profile:
                kwargs[pp] = self.profile["preserve_thinking_false_value"]
            else:
                kwargs[pp] = True

        # tool_stream
        ts = self._p("tool_stream_param")
        if ts:
            kwargs[ts] = True

        return payload

    # ============================================================
    # 四、URL 拼接 & 错误归一化
    # ============================================================
    def _endpoint(self) -> str:
        if not self.url.rstrip("/").endswith("/chat/completions"):
            return self.url.rstrip("/") + "/chat/completions"
        return self.url

    def _raise_from_response(self, resp: requests.Response):
        """把不同 provider 的错误体统一抛成 LLMRequestError"""
        try:
            body = resp.json()
        except json.JSONDecodeError:
            raise LLMRequestError(self.name, resp.status_code, "UNKNOWN", resp.text)

        # 常见结构1: {"error": {"code":..., "message":..., "request_id":...}}
        err = body.get("error") if isinstance(body, dict) else None
        if isinstance(err, dict):
            raise LLMRequestError(
                self.name, resp.status_code,
                str(err.get("code", "")),
                err.get("message", ""),
                err.get("request_id", ""),
            )
        # 常见结构2: 顶层平铺 {"code":..., "message":...}
        if isinstance(body, dict) and ("code" in body or "message" in body):
            raise LLMRequestError(
                self.name, resp.status_code,
                str(body.get("code", "")),
                body.get("message", ""),
                body.get("request_id", ""),
            )
        # 兜底
        raise LLMRequestError(self.name, resp.status_code, "UNKNOWN", json.dumps(body, ensure_ascii=False))

    # ============================================================
    # 五、非流式：_generate
    # ============================================================
    def _generate(self, messages: List[BaseMessage], stop: Optional[List[str]] = None, **kwargs) -> ChatResult:
        payload = self._build_payload(messages, stream=False, **kwargs)
        if stop:
            payload["stop"] = stop

        headers = {"Authorization": f"Bearer {self.apikey}", "Content-Type": "application/json"}
        resp = requests.post(self._endpoint(), headers=headers, json=payload, timeout=120)

        if resp.status_code >= 400:
            self._raise_from_response(resp)

        data = resp.json()
        choice = data["choices"][0]["message"]

        content = choice.get("content") or ""
        reasoning = choice.get(self._p("reasoning_field", "reasoning_content"))
        raw_tool_calls = choice.get("tool_calls") or []

        tool_calls = []
        for tc in raw_tool_calls:
            fn = tc.get("function", {})
            args = fn.get("arguments", "{}")
            if isinstance(args, str):
                try:
                    args = json.loads(args) if args else {}
                except json.JSONDecodeError:
                    args = {"_raw": args}
            tool_calls.append({
                "id": tc.get("id", ""),
                "name": fn.get("name", ""),
                "args": args,
            })

        ai = AIMessage(
            content=content,
            tool_calls=tool_calls,
            additional_kwargs={
                "usage": data.get("usage", {}),
                "reasoning_content": reasoning,
                "raw": data,
            },
        )
        return ChatResult(generations=[ChatGeneration(message=ai)])

    # ============================================================
    # 六、流式：_stream（累积 tool_calls 分片 + reasoning）
    # ============================================================
    def _stream(self, messages: List[BaseMessage], stop: Optional[List[str]] = None, **kwargs) -> Iterator[ChatGenerationChunk]:
        payload = self._build_payload(messages, stream=True, **kwargs)
        if stop:
            payload["stop"] = stop

        headers = {"Authorization": f"Bearer {self.apikey}", "Content-Type": "application/json"}
        resp = requests.post(self._endpoint(), headers=headers, json=payload, timeout=120, stream=True)

        if resp.status_code >= 400:
            self._raise_from_response(resp)

        # 累积器：index -> {id, name, arguments_str}
        tool_acc: Dict[int, Dict[str, Any]] = {}
        reasoning_field = self._p("reasoning_field", "reasoning_content")

        for line in resp.iter_lines():
            if not line:
                continue
            raw = line.decode("utf-8")
            if not raw.startswith("data: "):
                continue
            s = raw[6:]
            if s == "[DONE]":
                break
            try:
                chunk = json.loads(s)
            except json.JSONDecodeError:
                continue

            choices = chunk.get("choices") or []
            if not choices:
                continue
            delta = choices[0].get("delta", {})

            # 1) 文本增量
            c = delta.get("content")
            if c:
                yield ChatGenerationChunk(message=AIMessageChunk(content=c))

            # 2) reasoning 增量
            rc = delta.get(reasoning_field)
            if rc:
                yield ChatGenerationChunk(
                    message=AIMessageChunk(
                        content="",
                        additional_kwargs={"reasoning_content": rc},
                    )
                )

            # 3) tool_calls 分片累积
            for tc in delta.get("tool_calls") or []:
                idx = tc.get("index", 0)
                slot = tool_acc.setdefault(idx, {"id": "", "name": "", "arguments": ""})
                if tc.get("id"):
                    slot["id"] = tc["id"]
                fn = tc.get("function") or {}
                if fn.get("name"):
                    slot["name"] = fn["name"]
                if fn.get("arguments"):
                    slot["arguments"] += fn["arguments"]

            # 4) finish_reason 到 tool_calls 时吐出完整工具调用
            finish = choices[0].get("finish_reason")
            if finish == "tool_calls" and tool_acc:
                for idx in sorted(tool_acc.keys()):
                    slot = tool_acc[idx]
                    try:
                        args = json.loads(slot["arguments"]) if slot["arguments"] else {}
                    except json.JSONDecodeError:
                        args = {"_raw": slot["arguments"]}
                    yield ChatGenerationChunk(
                        message=AIMessageChunk(
                            content="",
                            tool_call_chunks=[{
                                "index": idx,
                                "id": slot["id"],
                                "name": slot["name"],
                                "args": slot["arguments"],
                            }],
                            additional_kwargs={
                                "parsed_tool_call": {
                                    "id": slot["id"],
                                    "name": slot["name"],
                                    "args": args,
                                }
                            },
                        )
                    )
                tool_acc.clear()

    # ============================================================
    # 七、对外 invoke / stream：兼容 dict 与 BaseMessage
    # ============================================================
    def invoke(self, raw_messages: List[Union[dict, BaseMessage]], **kwargs) -> AIMessage:
        messages = self._normalize_messages(raw_messages)
        return super().invoke(messages, **kwargs)

    def stream(self, raw_messages: List[Union[dict, BaseMessage]], **kwargs) -> Iterator[AIMessageChunk]:
        messages = self._normalize_messages(raw_messages)
        yield from super().stream(messages, **kwargs)

    # ============================================================
    # 八、bind_tools：接入 LangChain 工具生态
    # ============================================================
    def bind_tools(self, tools, **kwargs):
        formatted = []
        for t in tools:
            if isinstance(t, BaseTool):
                formatted.append(convert_to_openai_tool(t))
            elif isinstance(t, dict):
                formatted.append(t)
            else:
                formatted.append(convert_to_openai_tool(t))
        return self.bind(tools=formatted, **kwargs)


# ================================================================
# LLMInstance：直接 requests 调用（非 LangChain 路径），同样补上兼容
# ================================================================
class LLMInstance:
    """单个大模型实例，持有该模型的配置，提供chat/chat_stream方法"""
    def __init__(self, name: str, url: str, apikey: str, model: str, profile: Optional[dict] = None):
        self.name = name
        self.url = url
        self.apikey = apikey
        self.model = model
        self.profile = {**DEFAULT_PROFILE, **(profile or {})}

    def _endpoint(self) -> str:
        if not self.url.rstrip("/").endswith("/chat/completions"):
            return self.url.rstrip("/") + "/chat/completions"
        return self.url

    def _build_payload(self, messages: List[dict], stream: bool = False, **kwargs) -> dict:
        token_param = self.profile.get("token_param", "max_tokens")
        if "max_tokens" in kwargs:
            kwargs[token_param] = kwargs.pop("max_tokens")
        if "max_completion_tokens" in kwargs and token_param != "max_completion_tokens":
            kwargs[token_param] = kwargs.pop("max_completion_tokens")
        for p in self.profile.get("drop_params", []) or []:
            kwargs.pop(p, None)
        if "reasoning_effort" in kwargs and not self.profile.get("supports_reasoning_effort", False):
            kwargs.pop("reasoning_effort")

        payload = {"model": self.model, "messages": messages, **kwargs}
        if stream:
            payload["stream"] = True
        if payload.get("tools") and not self.profile.get("supports_tools", True):
            payload.pop("tools", None)
            payload.pop("tool_choice", None)
        return payload

    def chat(self, messages: List[dict], **kwargs) -> Dict[str, Any]:
        headers = {"Authorization": f"Bearer {self.apikey}", "Content-Type": "application/json"}
        payload = self._build_payload(messages, stream=False, **kwargs)
        try:
            resp = requests.post(self._endpoint(), headers=headers, json=payload, timeout=120)
            print(f"[{self.name}] status={resp.status_code}, raw_response={resp.text}")
            resp.raise_for_status()
            return resp.json()
        except requests.exceptions.HTTPError as e:
            print(f"\n==== LLM HTTP ERROR [{self.name}] ====")
            print(f"status_code: {resp.status_code}")
            print(f"response text: {resp.text}")
            raise e

    def invoke(self, messages: list, **kwargs) -> AIMessage:
        resp_json = self.chat(messages, **kwargs)
        choice = resp_json["choices"][0]["message"]
        content = choice.get("content") or ""
        reasoning = choice.get(self.profile.get("reasoning_field", "reasoning_content"))

        tool_calls = []
        for tc in choice.get("tool_calls") or []:
            fn = tc.get("function", {})
            args = fn.get("arguments", "{}")
            if isinstance(args, str):
                try:
                    args = json.loads(args) if args else {}
                except json.JSONDecodeError:
                    args = {"_raw": args}
            tool_calls.append({"id": tc.get("id", ""), "name": fn.get("name", ""), "args": args})

        return AIMessage(
            content=content,
            tool_calls=tool_calls,
            additional_kwargs={
                "usage": resp_json.get("usage", {}),
                "reasoning_content": reasoning,
                "raw_response": resp_json,
            },
        )

    def chat_stream(self, messages: List[dict], **kwargs) -> Generator[str, None, None]:
        """保持原语义：只 yield 文本增量"""
        headers = {"Authorization": f"Bearer {self.apikey}", "Content-Type": "application/json"}
        payload = self._build_payload(messages, stream=True, **kwargs)
        resp = requests.post(self._endpoint(), headers=headers, json=payload, timeout=120, stream=True)
        resp.raise_for_status()

        for line in resp.iter_lines():
            if not line:
                continue
            raw_line = line.decode("utf-8")
            if not raw_line.startswith("data: "):
                continue
            data_str = raw_line[6:]
            if data_str == "[DONE]":
                break
            try:
                chunk = json.loads(data_str)
                delta = chunk["choices"][0].get("delta", {})
                content = delta.get("content", "")
                if content:
                    yield content
            except json.JSONDecodeError:
                continue

    def stream_events(self, messages: List[dict], **kwargs) -> Generator[Dict[str, Any], None, None]:
        """
        新增：结构化流式，能拿到 reasoning / tool_calls 事件
        yield {"type": "content"|"reasoning"|"tool_call", ...}
        """
        headers = {"Authorization": f"Bearer {self.apikey}", "Content-Type": "application/json"}
        payload = self._build_payload(messages, stream=True, **kwargs)
        resp = requests.post(self._endpoint(), headers=headers, json=payload, timeout=120, stream=True)
        resp.raise_for_status()

        tool_acc: Dict[int, Dict[str, Any]] = {}
        reasoning_field = self.profile.get("reasoning_field", "reasoning_content")

        for line in resp.iter_lines():
            if not line:
                continue
            raw_line = line.decode("utf-8")
            if not raw_line.startswith("data: "):
                continue
            data_str = raw_line[6:]
            if data_str == "[DONE]":
                break
            try:
                chunk = json.loads(data_str)
            except json.JSONDecodeError:
                continue

            choices = chunk.get("choices") or []
            if not choices:
                continue
            delta = choices[0].get("delta", {})

            if delta.get("content"):
                yield {"type": "content", "text": delta["content"]}
            if delta.get(reasoning_field):
                yield {"type": "reasoning", "text": delta[reasoning_field]}

            for tc in delta.get("tool_calls") or []:
                idx = tc.get("index", 0)
                slot = tool_acc.setdefault(idx, {"id": "", "name": "", "arguments": ""})
                if tc.get("id"):
                    slot["id"] = tc["id"]
                fn = tc.get("function") or {}
                if fn.get("name"):
                    slot["name"] = fn["name"]
                if fn.get("arguments"):
                    slot["arguments"] += fn["arguments"]

            if choices[0].get("finish_reason") == "tool_calls" and tool_acc:
                for idx in sorted(tool_acc.keys()):
                    slot = tool_acc[idx]
                    try:
                        args = json.loads(slot["arguments"]) if slot["arguments"] else {}
                    except json.JSONDecodeError:
                        args = {"_raw": slot["arguments"]}
                    yield {"type": "tool_call", "id": slot["id"], "name": slot["name"], "args": args}
                tool_acc.clear()


# ================================================================
# LLMModelManager：加载 profile
# ================================================================
class LLMModelManager:
    def __init__(self, config_path: str = "models.json"):
        self.config_path = config_path
        self._models: Dict[str, dict] = {}
        self.load_config()

    def load_config(self):
        with open(self.config_path, "r", encoding="utf-8") as f:
            self._models = json.load(f)

    def save_config(self):
        with open(self.config_path, "w", encoding="utf-8") as f:
            json.dump(self._models, f, ensure_ascii=False, indent=2)

    def list_models(self):
        return list(self._models.keys())

    def add_model(self, name: str, url: str, apikey: str, model: str, profile: Optional[dict] = None):
        self._models[name] = {"url": url, "apikey": apikey, "model": model, "profile": profile or {}}
        self.save_config()

    def remove_model(self, name: str):
        if name in self._models:
            del self._models[name]
            self.save_config()

    def model(self) -> OpenAICustomChatModel:
        return self.get_model('deepseek')

    def __getattr__(self, model_name: str):
        if model_name in self._models:
            cfg = self._models[model_name]
            return lambda: OpenAICustomChatModel(
                name=model_name,
                url=cfg["url"],
                apikey=cfg["apikey"],
                model=cfg["model"],
                profile=cfg.get("profile", {}),
            )
        raise AttributeError(f"模型 {model_name} 不存在，可用模型：{self.list_models()}")

    def get_model(self, model_name: str) -> OpenAICustomChatModel:
        """返回 requests 直调版实例（LLMInstance）"""
        cfg = self._models.get(model_name)
        if not cfg:
            raise AttributeError(f"模型 {model_name} 不存在，可用模型：{self.list_models()}")
        return OpenAICustomChatModel(
            name=model_name,
            url=cfg["url"],
            apikey=cfg["apikey"],
            model=cfg["model"],
            profile=cfg.get("profile", {}),
        )



llm_mgr = LLMModelManager("models.json")


# ---------------- 使用示例 ----------------
if __name__ == "__main__":
    llm_mgr = LLMModelManager("models.json")
    messages = [{"role": "user", "content": "请根据下面提示词内容，为它生成的图片命名,直接回复即可，回复内容不要超过10个字符。提示词:A beautiful modern Chinese university campus girl, wearing a delicate white lace spaghetti strap dress, short bob haircut, fresh natural makeup, sweet gentle smile, standing indoors in a bright cozy room with soft natural light from window, minimalist elegant interior, youthful and refined, photorealistic style, cinematic lighting, high quality, 8K resolution"}]

    print("===== 非流式 chat =====")
    resp = llm_mgr.get_model("qiniu").invoke(messages, temperature=0.7)
    print(resp.content)

    print("\n===== 流式 chat_stream（纯文本）=====")
    full_text = ""
    for chunk in llm_mgr.get_model("qiniu").chat_stream(messages, temperature=0.7):
        full_text += chunk
        print(chunk, end="", flush=True)
    print("\n完整结果：", full_text)

    print("\n===== 结构化流式 stream_events（含 reasoning / tool_call）=====")
    for ev in llm_mgr.get_model("qiniu").stream_events(messages, temperature=0.7):
        if ev["type"] == "content":
            print(ev["text"], end="", flush=True)
        elif ev["type"] == "reasoning":
            print(f"\n[thinking] {ev['text']}", end="", flush=True)
        elif ev["type"] == "tool_call":
            print(f"\n[tool] {ev['name']}({ev['args']})")