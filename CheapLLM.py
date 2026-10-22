from openai import OpenAI
import os

class CheapLLM:
    def __init__(self, api_key: str = os.getenv("DEEPSEEK_API_KEY"), base_url: str = "https://api.deepseek.com", model: str = os.getenv("MODEL")):
        self.base_url: str = base_url
        self.model = os.getenv("MODEL"),
        self.api_key = os.getenv("DEEPSEEK_API_KEY"),
        
        self.client = OpenAI(api_key=self.api_key, base_url=self.base_url)
        self.model = model  # 或 "deepseek-coder" 用于代码理解
    
    def chat(self, prompt: str, system_prompt: str = None, temperature: float = 0.3, max_tokens = 200) -> str:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        
        response = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=temperature,
            max_tokens=200,
        )
        return response.choices[0].message.content.strip()

def cheap_llm():
    return CheapLLM()
# 使用示例 AGENT_AI_API_KEY
# AGENT_AI_TEXT_API_KEY="sk-vXRn1UP26oqmhHbo8JyoAYm8zP0M3qFUTHJCYTPZLcK5W26a"
# AGENT_AI_TEXT_URL="https://apihub.agnes-ai.com/v1/chat/completions"
# AGENT_AI_MODEL="agnes-2.5-flash"
# cheap_llm = CheapLLM(AGENT_AI_TEXT_API_KEY, AGENT_AI_TEXT_URL, AGENT_AI_MODEL)  # DeepSeek API Key

# desc = cheap_llm.chat(
#     prompt="""
#     技能名称：query_database
#     内部调用：execute_sql, format_results
#     功能描述：根据SQL查询公司数据库并返回格式化结果
#     请生成一段技能描述
#     """
# )
# print(desc)