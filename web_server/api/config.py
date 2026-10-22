# web_server/api/config.py
from typing import Dict, Any
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse

from web_server.config import TEMPLATES_DIR
from api_config_editor import save_config, get_preset_nodes, get_config

router = APIRouter(prefix="/api", tags=["config"])


@router.get("/editconfig", response_class=HTMLResponse)
async def edit_config(request: Request):
    """返回编辑器 HTML 页面"""
    print(f"templates 类型: {type(templates)}")
    print(f"templates 内容: {templates}")
    html_path = TEMPLATES_DIR / "config.html"
    with open(html_path, 'r', encoding='utf-8') as f:
        content = f.read()
    return HTMLResponse(content=content)


@router.get("/preset/nodes")
async def api_get_preset_nodes():
    """获取所有预置节点"""
    return get_preset_nodes()


@router.get("/config")
async def api_get_config():
    """获取当前 YAML 配置"""
    try:
        return JSONResponse(content=get_config())
    except FileNotFoundError:
        return JSONResponse(content={"name": "新配置", "entry": "start", "nodes": [], "edges": []})


@router.post("/config")
async def api_save_config(config: Dict[str, Any]):
    """保存 YAML 配置"""
    try:
        return save_config(config)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reload")
async def reload_config():
    """手动刷新配置"""
    from visualizer import reload
    reload()
    return {"status": "ok", "message": "配置已重新加载"}