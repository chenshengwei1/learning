"""
火山方舟豆包 Files API 纯HTTP客户端（无volcengine SDK）
接口文档：https://www.volcengine.com/docs/82379/1885708
能力：上传文件 / 获取文件详情 / 列出文件 / 删除文件
鉴权：ARK_API_KEY 作为 Bearer Token
"""
import os
import requests
from typing import Optional, Dict, Any, List
from datetime import datetime,timedelta
import time
from dotenv import load_dotenv
load_dotenv()

import logging
logging.basicConfig(format='%(asctime)s %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)
logger.setLevel(level=logging.INFO)

root = logging.getLogger()
root.setLevel(logging.DEBUG)


class ArkFileHttpClient:
    BASE_URL = "https://ark.cn-beijing.volces.com/api/v3"

    # user_data：多模态对话input_file，仅支持PDF/图片/音视频
    USER_DATA_SUFFIX = {".pdf", ".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".tiff",
                        ".mp4", ".avi", ".mov", ".mp3", ".wav", ".aac", ".m4a"}
    # agent：沙箱挂载，支持文本代码类
    AGENT_SUFFIX = {".txt", ".py", ".md", ".csv", ".json", ".yaml", ".yml", ".log"}

    # 后缀对应的标准MIME
    SUFFIX_MIME_MAP = {
        ".txt": "text/plain",
        ".log": "text/plain",
        ".py": "text/plain",
        ".md": "text/markdown",
        ".csv": "text/csv",
        ".json": "application/json",
        ".yaml": "text/yaml",
        ".yml": "text/yaml",
        ".pdf": "application/pdf",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".webp": "image/webp",
        ".bmp": "image/bmp",
        ".tiff": "image/tiff",
        ".mp4": "video/mp4",
        ".avi": "video/x-msvideo",
        ".mov": "video/quicktime",
        ".mp3": "audio/mpeg",
        ".wav": "audio/wav",
        ".aac": "audio/aac",
        ".m4a": "audio/mp4"
    }

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.headers = {
            "Authorization": f"Bearer {self.api_key}"
        }

    @staticmethod
    def auto_purpose(file_path: str) -> str:
        ext = os.path.splitext(file_path.lower())[1]
        logger.info(f"检测文件后缀: [{ext}]")
        if ext in ArkFileHttpClient.USER_DATA_SUFFIX:
            return "user_data"
        elif ext in ArkFileHttpClient.AGENT_SUFFIX:
            return "agent"
        else:
            raise ValueError(f"不支持的文件后缀：{ext}，文件：{file_path}")

    @staticmethod
    def get_mime_by_suffix(file_path: str) -> str:
        ext = os.path.splitext(file_path.lower())[1]
        return ArkFileHttpClient.SUFFIX_MIME_MAP.get(ext, "application/octet-stream")

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.headers = {
            "Authorization": f"Bearer {self.api_key}"
        }

    def upload_file(
            self,
            file_path: str,
            purpose: str = None,
            expire_days: Optional[int] = None,
            mime_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        上传本地文件
        :param file_path: 本地文件路径
        :param purpose: 固定 user_data
        :param expire_days: 过期天数 1~30，不填默认7天
        :return: 文件信息dict，包含 id(file_id)
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"文件不存在: {file_path}")

        if purpose is None:
            purpose = self.auto_purpose(file_path)
        if mime_type is None:
            mime_type = self.get_mime_by_suffix(file_path)

        url = f"{self.BASE_URL}/files"
        form_data = {
            "purpose": purpose
        }
        # [当前时刻+86400, 当前时刻+2592000]，即最少保留 1 天，最多保留 30 天。不传时默认保留 30 天（当前时刻 + 2592000）。
        expire_days = expire_days if expire_days else 30
        if expire_days is not None:
            expire_ts = int(time.time()) + expire_days * 24 * 60 * 60
            form_data["expire_at"] = expire_ts
        filename = os.path.basename(file_path)
        # files 表单上传
        with open(file_path, "rb") as f:
            # 三元组：(文件名, 文件句柄, mime_type)
            files = {"file": (filename, f, mime_type)}
            logger.info(f"files={files}, form data={form_data}")
            resp = requests.post(url, headers=self.headers, data=form_data, files=files, timeout=120)

        try:
            resp_json = resp.json()
        except Exception:
            raise RuntimeError(f"上传失败 code={resp.status_code}, raw={resp.text}")
        
        if resp.status_code >= 400:
            err_msg = resp_json.get("error", {}).get("message", resp.text)
            raise RuntimeError(f"上传失败 code={resp.status_code}, msg={resp.text}")
        return resp.json()

    def get_file_info(self, file_id: str) -> Dict[str, Any]:
        """查询单个文件详情"""
        url = f"{self.BASE_URL}/files/{file_id}"
        resp = requests.get(url, headers=self.headers, timeout=30)
        if resp.status_code >= 400:
            raise RuntimeError(f"查询文件失败 code={resp.status_code}, msg={resp.text}")
        return resp.json()

    def list_files(
            self,
            limit: int = 100,
            after: Optional[str] = None,
            purpose: Optional[str] = None
    ) -> Dict[str, Any]:
        url = f"{self.BASE_URL}/files"
        params = {"limit": limit}
        if after:
            params["after"] = after
        if purpose:
            params["purpose"] = purpose
        resp = requests.get(url, headers=self.headers, params=params, timeout=30)
        if resp.status_code >= 400:
            j = resp.json()
            msg = j.get("error", {}).get("message", resp.text)
            raise RuntimeError(f"列出文件失败 code={resp.status_code}, msg={msg}")
        return resp.json()

    def delete_file(self, file_id: str) -> Dict[str, Any]:
        url = f"{self.BASE_URL}/files/{file_id}"
        resp = requests.delete(url, headers=self.headers, timeout=30)
        if resp.status_code >= 400:
            j = resp.json()
            msg = j.get("error", {}).get("message", resp.text)
            raise RuntimeError(f"删除文件失败 code={resp.status_code}, msg={msg}")
        return resp.json()

    def wait_file_active(self, file_id: str, timeout: int = 60, interval: float = 1.0):
        start = time.time()
        while time.time() - start < timeout:
            info = self.get_file_info(file_id)
            status = info.get("status")
            if status == "active":
                return info
            if status == "failed":
                raise RuntimeError(f"文件处理失败: {info}")
            time.sleep(interval)
        raise TimeoutError(f"等待文件active超时({timeout}s), file_id={file_id}")


# ===== 测试入口 =====
if __name__ == "__main__":
    # 建议从环境变量读取密钥，不要硬编码
    ARK_API_KEY = os.getenv("DOUBAO_API_KEY")
    if not ARK_API_KEY:
        raise ValueError("请设置环境变量 ARK_API_KEY")

    client = ArkFileHttpClient(ARK_API_KEY)

    # 1.上传
    ret = client.upload_file("./app.log")
    file_id = ret["id"]
    print("upload result:", ret)

    # 2.查询
    info = client.get_file_info(file_id)
    print("file info:", info)

    # 3.列表
    lst = client.list_files()
    print("file list:", lst["data"])

    # 4.删除
    del_ret = client.delete_file(file_id)
    print("delete result:", del_ret)
