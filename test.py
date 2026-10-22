from datetime import datetime, timezone
import os
from dotenv import load_dotenv
load_dotenv()

import logging
logging.basicConfig(format='%(asctime)s %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)
logger.setLevel(level=logging.INFO)

today = datetime.now().strftime("%Y-%m-%d")

# 1) 全量 -> app_xxx.log
fh = logging.FileHandler(f'logs/app_{today}.log', encoding='utf-8')
fh.setLevel(logging.DEBUG)

root = logging.getLogger()
root.setLevel(logging.DEBUG)

fmt = logging.Formatter(
    '%(asctime)s - [%(name)s.%(funcName)s] - %(levelname)s - %(message)s'
)
fh.setFormatter(fmt)
root.addHandler(fh)

def case1():
    import inspect
    from langchain.agents.middleware import (
        SummarizationMiddleware,
        ToolCallLimitMiddleware,
        PIIMiddleware,
        ModelFallbackMiddleware,
        ModelCallLimitMiddleware
    )

    # 检查这个方法是否定义在它自己的 MRO 里、且不是基类的默认空实现
    for cls in ModelFallbackMiddleware.__mro__:
        if "awrap_model_call" in cls.__dict__:
            print(f"定义在: {cls.__name__}")
            print(inspect.getsource(cls.__dict__["awrap_model_call"]))
            break



def runCase():
    print(extract_time('1f1c3b5d-504a-6515-8017-75610c5ab567'))

def extract_time(uuid_str: str) -> datetime:
    """
    从 UUID v6 或 v7 字符串中提取生成时间（UTC）。
    根据版本号自动选择解析逻辑。
    """
    UUID_EPOCH_OFFSET_100NS = 0x01B21DD213814000

    # 1. 清理字符串并校验基础格式
    hex_str = uuid_str.replace("-", "").lower()
    if len(hex_str) != 32:
        raise ValueError("UUID 长度不合法")

    # 2. 读取版本号（第 13 个 hex 字符，索引 12）
    version = int(hex_str[12], 16)

    if version == 7:
        # --- UUID v7: 前 12 个 hex 字符就是 Unix 毫秒时间戳 ---
        timestamp_ms = int(hex_str[:12], 16)
        return datetime.fromtimestamp(timestamp_ms / 1000, tz=timezone.utc)

    elif version == 6:
        # --- UUID v6: 需要重组 60 位时间戳 ---
        # 结构：time_high(32) + time_mid(16) + version(4) + time_low(12)
        time_high = int(hex_str[0:8], 16)
        time_mid = int(hex_str[8:12], 16)
        # 注意：time_low 在版本号后面，是 hex_str[13:16]（跳过第 13 个字符'6'）
        time_low = int(hex_str[13:16], 16)

        # 拼回 60 位原始时间戳 (100ns 精度)
        timestamp_100ns = (time_high << 28) | (time_mid << 12) | time_low

        # 减去 UUID 纪元偏移，得到 Unix 100ns 时间戳
        unix_100ns = timestamp_100ns - UUID_EPOCH_OFFSET_100NS

        # 转成秒（浮点数保留微秒精度）
        unix_seconds = unix_100ns / 10_000_000

        return datetime.fromtimestamp(unix_seconds, tz=timezone.utc)

    else:
        raise ValueError(f"不支持的 UUID 版本: v{version}，仅支持 v6 和 v7")

# runCase()
import asyncio
import db_manager

async def test_get_checkpoint_history():
    # 测试获取 checkpoint 历史
    result = await db_manager.prune_checkpoints('d071b66e6fc0')
    # print(result)

async def test_mcp():
    from langchain_mcp_adapters.client import MultiServerMCPClient
    from langchain_mcp_adapters.tools import load_mcp_tools
    from langchain.agents import create_agent
    from langchain_deepseek import ChatDeepSeek

    async def main1():
        client = MultiServerMCPClient({
                    "redfox-douyin-mcp": {
                        "transport": "streamable_http",
                        "url": "https://mcp.redfox.hk/douyin/mcp",
                        "headers": {
                            "REDFOX_API_KEY": "ak_cb77f6950b5c49e8bc26739becc270e3"
                        }
                    }
                })
        
        # 关键：使用 async with 显式创建并保持一个持久化会话
        async with client.session("redfox-douyin-mcp") as session:
            tools = await load_mcp_tools(session)
            logger.info(f"拿到 {len(tools)} 个工具")
            for t in tools:
                logger.info(t)
            agent = create_agent(ChatDeepSeek(
                    model=os.getenv("MODEL"),
                    api_key=os.getenv("DEEPSEEK_API_KEY"),
                    temperature=0.3,
                    streaming=True,  # ✅ 开启流式
                ), tools)
            
            # 在这个 `async with` 块内执行所有需要用到工具的操作
            result = await agent.ainvoke({"messages": [("user", "查询抖音热门短剧")]})
            logger.info("查询抖音热门短剧")
            logger.info(result)
    await main1()

async def chat_qiniu():
    from core_model import llm_mgr

    messages = [{"role": "user", "content": "写一段简短的Python介绍"}]
    print("===== 非流式 chat =====")

    for llm in llm_mgr.list_models():
        print(f'test model {llm}')
        try:
            response = llm_mgr.get_model(llm).invoke(messages, temperature=0.7)
            print(f">>>>>>>>>>>>>>>>>>model {llm} can access")
        except Exception as e:
            print(str(e))
            print(f"<<<<<<<<<<<<<<<<<<model {llm} cannot access")


async def search():
    from pathlib import Path
    import httpx
    from fastapi import APIRouter, HTTPException

    async def search_skills(q: str = "", page: int = 1, page_size: int = 50):
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://skills.sh/api/search",
                params={"q": q, "limit": page_size}
            )
            return resp.json()
    print(await search_skills('test', 1, 20))


def bingtu():
    # 以下三行代码使编译器支持绘图功能：
    import sys
    import matplotlib
    #matplotlib.use('Agg')

    import matplotlib.pyplot as plt
    import numpy as np

    # 准备饼图数据：
    y = np.array([35, 25, 25, 15])  # 各区块数值比例

    # 绘制基础饼图：
    plt.pie(y)  # 创建简单饼图
    plt.show()  # 显示图表

    # 以下两行代码使编译器能够输出图形：
    plt.savefig(sys.stdout.buffer)
    sys.stdout.flush()

def testChunker():
    from rap.chunker import read_document, split_text
    text = read_document("C:/doc/doc/Ruby Com/OneDrive_1_2021-10-28/Order Management 101.pdf")
    chunks = split_text(text)
    print(f"共 {len(chunks)} 块")
    for i, c in enumerate(chunks[:3]):
        print(f"--- 块 {i} ({len(c)} 字) ---\n{c[:100]}...")


def text_to_image(prompt: str,) :
    """调用文生图模型。
    通常在智能体修改了自己的代码后调用。
    主要通过https://api.agnes-ai.cn/v1/images/generations 模型来生成图片
    
    Returns:
        JSON格式，参考
        {
            "created": 1780000000,
            "data": [
                {
                "url": "https://storage.googleapis.com/agnes-aigc/xxx.png",
                "b64_json": "iVBORw0KGgoAAAANSUhEUgAA...",
                "revised_prompt": null
                }
            ]
        }
    """
    import requests
    base_url = 'https://apihub.agnes-ai.com/v1'
    url = f"{base_url.rstrip('/')}/images/generations"
    from core_model import llm_mgr
    api_key = llm_mgr.agentai().apikey
    api_key = "sk-CEcInLoqClfEDHpsDojqRaMbX4Qb56Tduq9VrMefGjbsvX9I"
    model = "agnes-image-2.5-flash"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    return_base64 = True
    payload = {
        "model": model,
        "prompt": prompt,
        "size": "4K",
        "return_base64": False,
        "extra_body": {
            "response_format": "url"
            }
    }
    print(f"api_key={api_key}, model={model}")
    resp = requests.post(url, headers=headers, json=payload, timeout=120)
    resp.raise_for_status()
    result = resp.json()

    data = result.get("data") or []
    if not data:
        raise RuntimeError(f"API 未返回图片数据: {result}")

    first = data[0]
    return first

async def main():
    # await search()
    text_to_image('A clean product photo of a glass cube on a white studio background, soft shadows, high detail')

if __name__ == '__main__':
    asyncio.run(main())