import base64
from pathlib import Path
import httpx
from fastapi import APIRouter, HTTPException
from agent_core import list_skills

router = APIRouter(prefix="/api/skills")

SKILLS_ROOT = Path(".agents/skills")

from pydantic import BaseModel

class InstallRequest(BaseModel):
    owner: str
    repo: str
    skill_name: str
    branch: str = "main"
    github_token: str | None = None

@router.get("/list")
async def get_skills():
    return list_skills()
@router.get("/search")
async def search_skills(q: str = "", page: int = 1, page_size: int = 50):
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://skills.sh/api/search",
            params={"q": q, "limit": page_size}
        )
        return resp.json()

async def fetch_github_tree(
    owner: str, repo: str, branch: str, path: str, token: str | None = None
) -> list[dict]:
    """
    用 GitHub Trees API 递归获取指定目录下的所有文件。
    """
    headers = {"Accept": "application/vnd.github+json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    # 先获取 branch 对应的 tree SHA
    async with httpx.AsyncClient(timeout=30.0) as client:
        # 用 ref 直接查 tree，GitHub 支持 ref 作为 tree_sha
        url = f"https://api.github.com/repos/{owner}/{repo}/git/trees/{branch}?recursive=1"
        resp = await client.get(url, headers=headers)
        resp.raise_for_status()
        data = resp.json()

    if data.get("truncated"):
        raise HTTPException(
            status_code=413,
            detail="仓库文件过多，GitHub API 返回被截断，请改用浅克隆方式",
        )

    # 过滤出目标目录下的所有 blob（文件）
    prefix = path.rstrip("/") + "/"
    files = [
        item
        for item in data.get("tree", [])
        if item["type"] == "blob" and item["path"].startswith(prefix)
    ]
    return files


async def download_file(
    client: httpx.AsyncClient, owner: str, repo: str, branch: str, path: str, dest: Path
) -> None:
    """下载单个文件并写入本地。"""
    raw_url = f"https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{path}"
    resp = await client.get(raw_url)
    resp.raise_for_status()

    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(resp.content)


@router.post("/install")
async def install_skill(req: InstallRequest):
    """
    从 GitHub 安装 skill 到本地目录，包含该 skill 下的所有文件。
    """

    owner = req.owner
    repo = req.repo
    skill_name = req.skill_name
    branch = req.branch
    github_token = req.github_token


    target_dir = SKILLS_ROOT / skill_name
    if target_dir.exists():
        raise HTTPException(status_code=409, detail=f"Skill '{skill_name}' 已存在")

    # 目标 skill 在仓库中的路径
    skill_path = f"skills/{skill_name}"

    # 1. 获取文件列表
    try:
        files = await fetch_github_tree(owner, repo, branch, skill_path, github_token)
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            raise HTTPException(status_code=404, detail=f"仓库或分支不存在: {branch}")
        raise

    if not files:
        raise HTTPException(
            status_code=404,
            detail=f"在 {owner}/{repo} 的 {skill_path} 下未找到任何文件",
        )

    # 2. 逐个下载
    async with httpx.AsyncClient(timeout=60.0) as client:
        for file_info in files:
            rel_path = file_info["path"]
            # 去掉 skills/<skill_name>/ 前缀，保留相对路径
            relative = rel_path[len(f"skills/{skill_name}/"):]
            dest = target_dir / relative
            try:
                await download_file(client, owner, repo, branch, rel_path, dest)
            except Exception as e:
                # 清理已下载的部分文件
                if target_dir.exists():
                    import shutil
                    shutil.rmtree(target_dir, ignore_errors=True)
                raise HTTPException(
                    status_code=500,
                    detail=f"下载 {rel_path} 失败: {e}",
                )

    return {
        "status": "success",
        "skill": skill_name,
        "path": str(target_dir),
        "files_count": len(files),
    }