# web_server/main.py
from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles

from web_server.config import TEMPLATES_DIR
from web_server.utils.logger import setup_logger
from web_server.utils.helpers import init_session_metadata_table
from web_server.services.session_service import get_session_service

from db_manager import router as db_router

# 设置日志
setup_logger()

# 创建 FastAPI 应用
app = FastAPI(title="Leaning 智能助手", version="1.0")

# 配置模板
templates = Jinja2Templates(directory="templates")

# 静态文件
app.mount("/static", StaticFiles(directory="static"), name="static")

from CheapLLM import cheap_llm
from skill.SkillPackageLoader import fill_skill_descriptions
from skill.registry import get_skill_registry

# 注册路由
from web_server.api import chat, sessions, config, graph

app.include_router(chat.router)
app.include_router(sessions.router)
app.include_router(config.router)
app.include_router(graph.router)
app.include_router(db_router)


@app.get("/", response_class=HTMLResponse)
async def home():
    html_path = TEMPLATES_DIR / "chat.html"
    with open(html_path, 'r', encoding='utf-8') as f:
        return HTMLResponse(content=f.read())


def init():
    """启动初始化"""
    init_session_metadata_table()
    session_service = get_session_service()
    session_service.load_existing_sessions()


if __name__ == "__main__":
    import uvicorn
    
    init()

    # 第一步：初始化 LLM 客户端
    llm_client = cheap_llm()
    
    # 第二步：扫描并填充缺失的 description
    print("=" * 50)
    print("1. 扫描技能并填充描述...")
    updated = fill_skill_descriptions("./skills", llm_client)
    print(f"   ✅ 更新了 {updated} 个技能描述")
    
    # 第三步：注册所有技能
    print("\n2. 注册技能...")
    registry = get_skill_registry("./skills")
    print(f"   ✅ 已注册 {registry.list_skills()} 个技能")
    
    print("""
╔══════════════════════════════════════════════╗
║    🚀 Leaning 智能助手 Web 服务              ║
║                                              ║
║    打开浏览器访问：http://localhost:8801     ║
║                                              ║
║    按 Ctrl+C 停止服务                        ║
╚══════════════════════════════════════════════╝
    """)
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8801,
        reload=True,
        log_level="info"
    )