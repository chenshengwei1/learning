# web_server/api/graph.py
from fastapi import APIRouter
from fastapi.responses import HTMLResponse

from visualizer import show_graph

router = APIRouter(prefix="/api", tags=["graph"])


@router.get("/graph")
async def get_graph_api():
    return HTMLResponse(show_graph())