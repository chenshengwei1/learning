"""
agent_core_file.py
文件管理模块，包含 DeepSeekFileMgr 和 FastAPI 路由处理函数。
"""
import os
import uuid
import logging
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from openai import OpenAI, APIError, APIConnectionError, APIStatusError
from openai.types import FileObject

from core_model import llm_mgr
deepseek_model = llm_mgr.deepseek()

logger = logging.getLogger(__name__)

# ─── 常量 ────────────────────────────────────────────────
ALLOWED_IMAGE_FORMATS = {"jpeg", "png", "gif", "webp"}
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)
MAX_SIZE = 10 * 1024 * 1024  # 10 MB


# ─── 自定义异常 ───────────────────────────────────────────
class FileFormatError(ValueError):
    """文件格式不支持。"""


class FileSizeError(ValueError):
    """文件超过大小限制。"""


# ─── 文件内容类型判断 ─────────────────────────────────────
def check_image_type_from_bytes(header: bytes) -> str:
    """根据文件头字节判断图片类型，不支持则抛错。"""
    if header[:3] == b"\xff\xd8\xff":
        fmt = "jpeg"
    elif header[:8] == b"\x89PNG\r\n\x1a\n":
        fmt = "png"
    elif header[:6] in (b"GIF87a", b"GIF89a"):
        fmt = "gif"
    elif header[:4] == b"RIFF" and header[8:12] == b"WEBP":
        fmt = "webp"
    else:
        fmt = None

    if fmt not in ALLOWED_IMAGE_FORMATS:
        raise FileFormatError(
            f"不支持的文件格式: {fmt or '未知'}，仅支持 JPEG、PNG、GIF、WebP"
        )
    return fmt


def check_image_type(file_path: str | Path) -> str:
    """根据文件实际内容判断图片类型，不支持则抛错。"""
    try:
        with open(file_path, "rb") as f:
            header = f.read(12)
    except FileNotFoundError:
        raise FileNotFoundError(f"文件不存在: {file_path}")
    except PermissionError:
        raise PermissionError(f"无权限读取文件: {file_path}")
    except OSError as e:
        raise OSError(f"读取文件失败: {file_path}, {e}")

    return check_image_type_from_bytes(header)


# ─── DeepSeekFileMgr ─────────────────────────────────────
class DeepSeekFileMgr:
    """
    文件管理类，参考 OpenAI client.files.create 接口设计。
    封装文件上传、列表、详情查询，并强制校验图片格式。
    """

    def __init__(self, api_key: str | None = None, base_url: str | None = None):
        api_key = deepseek_model.apikey or api_key or os.getenv("DEEPSEEK_API_KEY")
        if not api_key:
            raise ValueError("缺少 API Key，请设置 DEEPSEEK_API_KEY 环境变量")

        try:
            self.client = OpenAI(
                api_key=api_key,
                base_url=base_url
                or os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com"),
            )
        except Exception as e:
            logger.exception("初始化 OpenAI 客户端失败")
            raise RuntimeError(f"初始化客户端失败: {e}") from e

    def upload(self, filepath: str | Path) -> FileObject:
        """
        上传文件。
        1. 先校验文件类型（实际内容判断）
        2. 再通过 OpenAI Files API 上传
        """
        filepath = Path(filepath)

        # 1. 格式校验
        try:
            check_image_type(filepath)
        except (FileFormatError, FileNotFoundError, PermissionError, OSError) as e:
            logger.warning("文件校验失败: %s", e)
            raise

        # 2. 大小校验
        try:
            size = filepath.stat().st_size
        except OSError as e:
            raise OSError(f"获取文件大小失败: {filepath}, {e}")
        if size > MAX_SIZE:
            raise FileSizeError(f"文件超过 {MAX_SIZE // 1024 // 1024}MB 限制")

        # 3. 上传
        try:
            with filepath.open("rb") as f:
                response = self.client.files.create(
                    file=f,
                    purpose="user_data",
                )
            return response
        except APIConnectionError as e:
            logger.error("无法连接 DeepSeek API: %s", e)
            raise RuntimeError("无法连接文件服务，请稍后重试") from e
        except APIStatusError as e:
            logger.error("API 返回错误 status=%s body=%s", e.status_code, e.response.text)
            raise RuntimeError(f"文件服务返回错误: {e.status_code}") from e
        except APIError as e:
            logger.error("API 调用失败: %s", e)
            raise RuntimeError(f"文件上传失败: {e}") from e
        except OSError as e:
            logger.error("读取文件失败: %s", e)
            raise

    def list(self) -> list[FileObject]:
        """列出所有文件。"""
        try:
            response = self.client.files.list(purpose="user_data")
            return list(response.data)
        except APIConnectionError as e:
            logger.error("无法连接 DeepSeek API: %s", e)
            raise RuntimeError("无法连接文件服务，请稍后重试") from e
        except APIStatusError as e:
            logger.error("API 返回错误 status=%s", e.status_code)
            raise RuntimeError(f"文件服务返回错误: {e.status_code}") from e
        except APIError as e:
            logger.error("API 调用失败: %s", e)
            raise RuntimeError(f"获取文件列表失败: {e}") from e

    def info(self, file_id: str) -> FileObject:
        """查询单个文件详情。"""
        if not file_id:
            raise ValueError("file_id 不能为空")

        try:
            return self.client.files.retrieve(file_id)
        except APIConnectionError as e:
            logger.error("无法连接 DeepSeek API: %s", e)
            raise RuntimeError("无法连接文件服务，请稍后重试") from e
        except APIStatusError as e:
            if e.status_code == 404:
                raise FileNotFoundError(f"文件不存在: {file_id}") from e
            logger.error("API 返回错误 status=%s", e.status_code)
            raise RuntimeError(f"文件服务返回错误: {e.status_code}") from e
        except APIError as e:
            logger.error("API 调用失败: %s", e)
            raise RuntimeError(f"查询文件失败: {e}") from e


# ─── 内部工具 ─────────────────────────────────────────────
async def _save_upload(file: UploadFile) -> Path:
    """校验并保存上传文件到本地，返回保存路径。"""
    # 读取文件头做格式校验
    try:
        header = await file.read(12)
    except Exception as e:
        raise HTTPException(400, f"读取上传内容失败: {e}")

    try:
        check_image_type_from_bytes(header)
    except FileFormatError as e:
        raise HTTPException(400, f"{file.filename}: {e}")

    ext = Path(file.filename or "").suffix.lower()
    if not ext:
        ext = ".bin"
    saved_name = f"{uuid.uuid4().hex}{ext}"
    save_path = UPLOAD_DIR / saved_name

    try:
        await file.seek(0)
        size = 0
        with save_path.open("wb") as f:
            while chunk := await file.read(1024 * 1024):
                size += len(chunk)
                if size > MAX_SIZE:
                    f.close()
                    save_path.unlink(missing_ok=True)
                    raise HTTPException(
                        400,
                        f"{file.filename}: 文件超过 {MAX_SIZE // 1024 // 1024}MB 限制",
                    )
                f.write(chunk)
    except HTTPException:
        raise
    except OSError as e:
        save_path.unlink(missing_ok=True)
        logger.exception("保存文件失败")
        raise HTTPException(500, f"保存文件失败: {e}")
    finally:
        try:
            await file.close()
        except Exception:
            logger.warning("关闭上传文件失败", exc_info=True)

    return save_path


# ─── FastAPI 路由处理函数 ─────────────────────────────────
async def upload(file: UploadFile = File(...)):
    """单文件上传。"""
    save_path = await _save_upload(file)

    try:
        mgr = DeepSeekFileMgr()
        result = mgr.upload(save_path)
    except FileFormatError as e:
        save_path.unlink(missing_ok=True)
        raise HTTPException(400, str(e))
    except FileSizeError as e:
        save_path.unlink(missing_ok=True)
        raise HTTPException(400, str(e))
    except RuntimeError as e:
        save_path.unlink(missing_ok=True)
        raise HTTPException(502, str(e))
    except Exception as e:
        save_path.unlink(missing_ok=True)
        logger.exception("上传到文件服务失败")
        raise HTTPException(500, f"上传失败: {e}")

    return {
        "code": 0,
        "msg": "上传成功",
        "data": {
            "file_id": result.id,
            "filename": result.filename,
            "bytes": result.bytes,
            "local_url": f"/files/{save_path.name}",
        },
    }


async def upload_multiple(files: list[UploadFile] = File(...)):
    """多文件上传。"""
    if not files:
        raise HTTPException(400, "未提供任何文件")

    results = []
    try:
        mgr = DeepSeekFileMgr()
    except ValueError as e:
        raise HTTPException(500, str(e))

    for file in files:
        save_path = await _save_upload(file)
        try:
            result = mgr.upload(save_path)
        except (FileFormatError, FileSizeError) as e:
            save_path.unlink(missing_ok=True)
            raise HTTPException(400, f"{file.filename}: {e}")
        except RuntimeError as e:
            save_path.unlink(missing_ok=True)
            raise HTTPException(502, f"{file.filename}: {e}")
        except Exception as e:
            save_path.unlink(missing_ok=True)
            logger.exception("上传文件 %s 失败", file.filename)
            raise HTTPException(500, f"{file.filename} 上传失败: {e}")

        results.append({
            "file_id": result.id,
            "filename": result.filename,
            "bytes": result.bytes,
            "local_url": f"/files/{save_path.name}",
        })

    return {"code": 0, "msg": "上传成功", "data": results}


async def list_files():
    """列出所有已上传文件。"""
    try:
        mgr = DeepSeekFileMgr()
        files = mgr.list()
    except ValueError as e:
        raise HTTPException(500, str(e))
    except RuntimeError as e:
        raise HTTPException(502, str(e))
    except Exception as e:
        logger.exception("获取文件列表失败")
        raise HTTPException(500, f"获取文件列表失败: {e}")

    return {
        "code": 0,
        "data": [
            {
                "file_id": f.id,
                "filename": f.filename,
                "bytes": f.bytes,
                "created_at": f.created_at,
                "status": f.status,
            }
            for f in files
        ],
    }


async def info(file_id: str):
    """查询单个文件详情。"""
    if not file_id:
        raise HTTPException(400, "file_id 不能为空")

    try:
        mgr = DeepSeekFileMgr()
        f = mgr.info(file_id)
    except FileNotFoundError as e:
        raise HTTPException(404, str(e))
    except ValueError as e:
        raise HTTPException(400, str(e))
    except RuntimeError as e:
        raise HTTPException(502, str(e))
    except Exception as e:
        logger.exception("查询文件 %s 详情失败", file_id)
        raise HTTPException(500, f"查询失败: {e}")

    return {
        "code": 0,
        "data": {
            "file_id": f.id,
            "filename": f.filename,
            "bytes": f.bytes,
            "created_at": f.created_at,
            "status": f.status,
            "purpose": f.purpose,
        },
    }


# ─── FastAPI 应用集成示例 ─────────────────────────────────
def create_app() -> FastAPI:
    app = FastAPI(title="Agent Core File Service")

    app.post("/upload")(upload)
    app.post("/upload-multiple")(upload_multiple)
    app.get("/list")(list_files)
    app.get("/info/{file_id}")(info)

    from fastapi.staticfiles import StaticFiles
    app.mount("/files", StaticFiles(directory=UPLOAD_DIR), name="files")

    return app

# ===== 测试入口 =====
if __name__ == "__main__":
    async def main():
        files = await list_files()
        for f in files['data']:
            print(f"file info:{f}")

    import asyncio
    asyncio.run(main())
    