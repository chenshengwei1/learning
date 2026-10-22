import sys
import io
import os

# 强制 UTF-8 编码
# tools.py
import json
import subprocess
import glob
from pathlib import Path
from langchain_core.tools import tool
import requests
import logging
from core_model import llm_mgr
logger = logging.getLogger(__name__)

_current_project_path = None  # 初始为空，必须由用户指定或 agent 设置

def get_project_path():
    """获取当前项目路径，未设置时返回 None"""
    return _current_project_path

def require_project_path():
    """获取项目路径，如果未设置则抛出异常"""
    path = get_project_path()
    if path is None:
        raise ValueError(
            "❌ 尚未设置项目路径。\n"
            "请先通过以下任一方式指定：\n"
            "1. 用户说'切换到 X:\\xxx 项目'\n"
            "2. 用户说'设置项目路径为 X:\\xxx'\n"
            "3. 用户直接告诉你项目在哪里"
        )
    return path

# ============ 文件操作工具 ============

@tool
def read_file(file_path: str) -> str:
    """读取 leaning 项目中指定文件的内容。
    
    Args:
        file_path: 相对于项目根目录的文件路径，如 'server.js' 或 'pages/学习笔记.html'
    
    Returns:
        文件的完整内容，或错误信息
    """
    full_path = os.path.join(file_path)
    try:
        with open(full_path, 'r', encoding='utf-8') as f:
            content = f.read()
        return f"✅ 文件 {file_path} 的内容：\n\n{content}"
    except FileNotFoundError:
        return f"❌ 文件不存在：{file_path}"
    except Exception as e:
        return f"❌ 读取文件出错：{str(e)}"


@tool
def write_file(file_path: str, content: str) -> str:
    """创建或覆盖 leaning 项目中的文件。
    
    Args:
        file_path: 相对于项目根目录的文件路径
        content: 要写入的文件内容
    
    Returns:
        操作结果
    """
    full_path = os.path.join(file_path)
    try:
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        
        with open(full_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return f"✅ 文件 {file_path} 已成功保存"
    except Exception as e:
        return f"❌ 写入文件出错：{str(e)}"




def search_in_project(keyword: str) -> str:
    """在 leaning 项目的所有代码文件中搜索指定关键词。
    
    Args:
        keyword: 要搜索的关键词
    
    Returns:
        包含关键词的文件列表及匹配行
    """
    result = f"🔍 搜索关键词 '{keyword}' 的结果：\n\n"
    found = False
    
    for root, dirs, files in os.walk(require_project_path()):
        if 'node_modules' in root:
            continue
        
        for file in files:
            if file.endswith(('.js', '.html', '.json', '.ejs', '.css')):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        lines = f.readlines()
                    
                    matches = []
                    for i, line in enumerate(lines, 1):
                        if keyword.lower() in line.lower():
                            matches.append(f"    第{i}行: {line.strip()}")
                    
                    if matches:
                        found = True
                        rel_path = os.path.relpath(file_path, require_project_path())
                        result += f"📄 {rel_path}\n"
                        result += "\n".join(matches[:5])
                        if len(matches) > 5:
                            result += f"\n    ... 还有 {len(matches) - 5} 处匹配"
                        result += "\n\n"
                except:
                    continue
    
    if not found:
        result += "未找到匹配的内容"
    
    return result


@tool
def run_command(command: str) -> str:
    """在 leaning 项目目录下执行终端命令。
    支持的命令：npm install, npm start, node server.js, npm init 等。
    
    Args:
        command: 要执行的命令
    
    Returns:
        命令执行结果
    """
    try:
        result = subprocess.run(
            command,
            shell=True,
            cwd=get_project_path(),
            capture_output=True,
            text=True,
            timeout=30,
            encoding='utf-8',
            errors='replace'
        )
        
        output = ""
        if result.stdout:
            output += f"📤 标准输出：\n{result.stdout}\n"
        if result.stderr:
            output += f"⚠️ 标准错误：\n{result.stderr}\n"
        if not output:
            output = "✅ 命令执行完成，无输出"
        
        return output
    except subprocess.TimeoutExpired:
        return "⏰ 命令执行超时（超过30秒）"
    except Exception as e:
        return f"❌ 命令执行出错：{str(e)}"

@tool
def check_balance() -> str:
    """查询 DeepSeek API 账户余额。
    返回账户的可用余额信息，包括总余额、赠送余额和充值余额。
    
    Returns:
        账户余额的详细信息
    """
    
    api_key = os.getenv("DEEPSEEK_API_KEY")
    if not api_key:
        return "❌ 未配置 DEEPSEEK_API_KEY，无法查询余额"
    
    try:
        response = requests.get(
            "https://api.deepseek.com/user/balance",
            headers={
                "Accept": "application/json",
                "Authorization": f"Bearer {api_key}"
            },
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            is_available = data.get("is_available", False)
            balance_infos = data.get("balance_infos", [])
            
            if not balance_infos:
                return "⚠️ 未获取到余额信息"
            
            result = "💰 DeepSeek 账户余额：\n\n"
            for info in balance_infos:
                currency = info.get("currency", "未知")
                total = info.get("total_balance", "0")
                granted = info.get("granted_balance", "0")
                topped_up = info.get("topped_up_balance", "0")
                
                result += f"  币种：{currency}\n"
                result += f"  总余额：{total} 元\n"
                result += f"  赠送余额：{granted} 元\n"
                result += f"  充值余额：{topped_up} 元\n"
            
            if not is_available:
                result += "\n⚠️ 当前账户余额不足，无法继续调用 API"
            else:
                result += "\n✅ 账户状态正常，可正常调用 API"
            
            return result
            
        elif response.status_code == 401:
            return "❌ API Key 无效，请检查 .env 中的 DEEPSEEK_API_KEY"
        else:
            return f"❌ 查询失败，状态码：{response.status_code}"
            
    except Exception as e:
        return f"❌ 查询余额失败：{str(e)}"
    
def switch_project(project_path: str) -> str:
    """切换到指定项目路径。
    用户说"切换到某个项目"或"换到另一个项目"时调用此工具。
    
    Args:
        project_path: 项目根目录的绝对路径，如 'D:\\doc\\work\\another-project'
    
    Returns:
        切换结果
    """
    global _current_project_path
    
    if not os.path.exists(project_path):
        return f"❌ 项目路径不存在：{project_path}\n请确认路径是否正确，或先创建该目录。"
    
    _current_project_path = project_path
    
    result = f"✅ 已切换到项目：{project_path}\n\n"
    
    pages_dir = os.path.join(project_path, "pages")
    if os.path.exists(pages_dir):
        html_files = glob.glob(os.path.join(pages_dir, "*.html"))
        result += f"📁 发现 {len(html_files)} 个页面\n"
    else:
        result += "📁 未找到 pages 目录\n"
    
    if os.path.exists(os.path.join(project_path, "server.js")):
        result += "✅ 发现 server.js\n"
    
    if os.path.exists(os.path.join(project_path, "package.json")):
        result += "✅ 发现 package.json\n"
    
    return result

@tool
def git_commit(projectPath: str, message: str) -> str:
    """提交所有变更到 git，自动执行 add、commit。
    
    Args:
        projectPath: 具有git信息的根项目路径
        message: commit 信息
    
    Returns:
        操作结果
    """
    import subprocess
    
    project_path = projectPath
    
    git_dir = os.path.join(project_path, ".git")
    if not os.path.exists(git_dir):
        return "❌ 当前项目不是 git 仓库。请先在项目目录执行 git init"
    
    try:
        result1 = subprocess.run(
            "git add .",
            shell=True,
            cwd=project_path,
            capture_output=True,
            text=True,
            timeout=30,
            encoding='utf-8',
            errors='replace'
        )
        
        result2 = subprocess.run(
            f'git commit -m "{message}"',
            shell=True,
            cwd=project_path,
            capture_output=True,
            text=True,
            timeout=30,
            encoding='utf-8',
            errors='replace'
        )
        
        output = ""
        if result2.returncode == 0:
            output = f"✅ 提交成功\n{result2.stdout}"
        elif "nothing to commit" in result2.stdout or "nothing to commit" in result2.stderr:
            output = "⚠️ 没有需要提交的变更"
        else:
            output = f"❌ 提交失败\n{result2.stderr}"
        
        return output
        
    except Exception as e:
        return f"❌ git 操作失败：{str(e)}"


@tool
def git_status(projectPath: str,) -> str:
    """查看当前项目的 git 状态（有哪些文件修改了）
        Args:
                projectPath: 具有git信息的根项目路径
    """
    import subprocess
    
    project_path = projectPath
    
    try:
        result = subprocess.run(
            "git status",
            shell=True,
            cwd=project_path,
            capture_output=True,
            text=True,
            timeout=10,
            encoding='utf-8',
            errors='replace'
        )
        return result.stdout or result.stderr
    except Exception as e:
        return f"❌ 查看 git 状态失败：{str(e)}"

@tool
def text_to_image(prompt: str, size:str="1K", ratio:str="1:1", images = []) :
    """调用文生图模型。
    通常在智能体修改了自己的代码后调用。
    主要通过https://api.agnes-ai.cn/v1/images/generations 模型来生成图片

    为了获得可预期的输出尺寸，建议将 size 与 ratio 配合使用。
    推荐 size 值：1K、2K、3K、4K
    支持的 ratio 值：1:1、3:4、4:3、16:9、9:16、2:3、3:2、21:9
    如果请求 1920x1080 或 2560x1440 这类不受原生支持的精确尺寸，服务可能会自动映射到最接近的标准档位和宽高比。
    如果需要生成 1920x1080 或 2560x1440 这类常见 16:9 显示素材，建议请求 size: "2K" 和 ratio: "16:9"，再在下游裁剪或缩放到最终画布。
    Args:
        prompt - 图像生成或图像编辑的文本指令。
        size - 输出尺寸档位。推荐值为 1K、2K、3K、4K。也兼容 1024x768 这类历史精确尺寸写法，但不支持的尺寸可能会被标准化。默认4K
        ratio - 与档位式 size 配合使用的宽高比。支持 1:1、3:4、4:3、16:9、9:16、2:3、3:2、21:9，默认值为 1:1。
        image - 参考的图片url , "image": [
                "https://example.com/character-1.png",
                "https://example.com/character-2.png"
            ]
    
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
    Ratio	1K	2K	3K	4K
    1:1	1024x1024	2048x2048	3072x3072	4096x4096
    3:4	864x1152	1728x2304	2592x3456	3456x4608
    4:3	1152x864	2304x1728	3456x2592	4608x3456
    16:9	1312x736	2624x1472	3936x2208	5248x2944
    9:16	736x1312	1472x2624	2208x3936	2944x5248
    2:3	832x1248	1664x2496	2496x3744	3328x4992
    3:2	1248x832	2496x1664	3744x2496	4992x3328
    21:9	1568x672	3136x1344	4704x2016	6272x2688
    """
    base_url = 'https://api.agnes-ai.cn/v1'
    base_url = 'https://apihub.agnes-ai.com/v1'
    url = f"{base_url.rstrip('/')}/images/generations"
    
    api_key = llm_mgr.agentai().apikey
    model = "agnes-image-2.5-flash"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    return_base64 = False
    payload = {
        "model": model,
        "prompt": prompt,
        "size": size,
        "ratio":ratio,
        "return_base64": False,
        "extra_body": {
        "response_format": "url"
        }
    }

    if images:
        payload['extra_body']['image'] = images

    # ---- 429 换 key 重试 ----
    api_keys = ["sk-vXRn1UP26oqmhHbo8JyoAYm8zP0M3qFUTHJCYTPZLcK5W26a","sk-O67f4WkZb73tEcsrO9Pir3I7hE1qkhrpPoRrlqiFa7Ka8CR7","sk-CEcInLoqClfEDHpsDojqRaMbX4Qb56Tduq9VrMefGjbsvX9I"]
    last_exc = None
    for idx, api_key in enumerate(api_keys):
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        try:
            resp = requests.post(url, headers=headers, json=payload, timeout=120)
        except requests.RequestException as e:
            # 网络错误：不换 key，直接抛（或你也可以选择重试同一个 key）
            logger.warning(f"[text_to_image] 网络异常，key#{idx}: {e}")
            raise

        if resp.status_code == 429:
            logger.warning(
                f"[text_to_image] key#{idx} 触发 429，尝试下一个 key。"
                f"响应片段: {resp.text[:200]}"
            )
            last_exc = requests.HTTPError(
                f"429 Too Many Requests for url: {url}", response=resp
            )
            continue

        # 非 429：正常 raise（4xx/5xx 都交给上层）
        resp.raise_for_status()
        result = resp.json()
        break
    else:
        # 所有 key 都 429
        raise last_exc or RuntimeError("所有 API key 均触发 429")

    resp = requests.post(url, headers=headers, json=payload, timeout=120)
    resp.raise_for_status()
    result = resp.json()

    data = result.get("data") or []
    if not data:
        raise RuntimeError(f"API 未返回图片数据: {result}")

    first = data[0]

    # ---------------- 保存到本地 images/{date}/ ----------------
    try:
        try:
            messages = [{"role": "user", "content": f"请根据下面提示词内容，为它生成的图片命名,直接回复即可，回复内容不要超过10个字符。提示词:{prompt}"}]
            response = llm_mgr.agentai().chat(messages, temperature=0.7)
            filename = response["choices"][0]["message"]["content"]
        except Exception as ex:
            filename = None
        local_path = _save_image_locally(first, filename)
        first["local_path"] = local_path
        print(f"[text_to_image] 图片已保存到本地: {local_path}")
    except Exception as e:
        # 保存失败不影响主流程，仅打印告警
        first["local_path"] = None
        logger.exception(f"[text_to_image] 保存图片到本地失败: {e}")

    return first

import uuid
from datetime import datetime
from urllib.parse import urlparse
import re
def _save_image_locally(image_item: dict, filename:str) -> str:
    """把单张图片保存到 images/{date}/ 下，返回本地绝对路径。

    image_item 支持两种形态：
      - 含 "url" 字段：下载 URL 内容
      - 含 "b64_json" 字段：base64 解码保存
    """
    date_str = datetime.now().strftime("%Y-%m-%d")
    save_dir = os.path.join("images", date_str)
    os.makedirs(save_dir, exist_ok=True)

    url = image_item.get("url")
    b64 = image_item.get("b64_json")

    if url:
        img_resp = requests.get(url, timeout=120)
        img_resp.raise_for_status()
        content = img_resp.content
        ext = _guess_ext_from_url_or_ct(url, img_resp.headers.get("Content-Type", ""))
    elif b64:
        import base64
        content = base64.b64decode(b64)
        ext = ".png"  # b64 无法可靠判断格式，默认 png
    else:
        raise RuntimeError("图片数据既无 url 也无 b64_json，无法保存")

    filename = filename or f"{datetime.now().strftime('%H%M%S')}_{uuid.uuid4().hex[:8]}{ext}"
    local_path = os.path.abspath(os.path.join(save_dir, filename))

    with open(local_path, "wb") as f:
        f.write(content)

    return local_path


def _guess_ext_from_url_or_ct(url: str, content_type: str) -> str:
    """从 URL 或 Content-Type 推断扩展名，默认 .png。"""
    # 先看 Content-Type
    ct = (content_type or "").lower()
    if "jpeg" in ct or "jpg" in ct:
        return ".jpg"
    if "webp" in ct:
        return ".webp"
    if "gif" in ct:
        return ".gif"
    if "png" in ct:
        return ".png"

    # 再看 URL 后缀
    path = urlparse(url).path
    m = re.search(r"\.(png|jpg|jpeg|webp|gif)$", path, re.IGNORECASE)
    if m:
        ext = m.group(1).lower()
        return ".jpg" if ext == "jpeg" else f".{ext}"

    return ".png"
@tool
def deepseek_search(query:str, count:int = 10, ori_question:str = None, localization:str = None, need_content:bool = False):
    """Search 接口按 query 搜索网页，返回结构化结果。该接口由 DeepSeek 自研搜索引擎提供支持。

    Args:
        字段	类型	必填	默认值	说明
        query	string	是	-	搜索词，1～128 个 Unicode 字符，不能全为空白，支持下方列出的搜索语法。
        count	integer	否	10	返回条数，1～50。
        ori_question	string	否	-	触发搜索的用户原始问题，1～128 个字符，有助于更好地理解搜索意图，传 null 视为未提供。
        localization	string	否	""	用于优先返回本地化搜索结果的 IP 地址。
        need_content	boolean	否	false	是否在 content 中返回网页正文，为 false 时 content 恒为空字符串。
        请求体中的未知字段会被忽略。

        搜索语法
        query 中的搜索语法会原样传递给搜索服务。下表中的示例将操作符与搜索词组合使用；你可以在一个 query 中组合多个操作符。

        操作符	示例	说明
        site:	DeepSeek site:github.com	将结果限制在指定站点，指定多个时用空格分隔并通过 OR 连接，例如 DeepSeek site:github.com OR site:huggingface.co。
        -site:	DeepSeek -site:example.com	排除指定站点，指定多个时用空格分隔。
        -	DeepSeek -广告	排除包含指定关键词的网页，指定多个时用空格分隔。
        -"..."	DeepSeek -"release notes"	排除包含指定短语的网页，短语内可以包含空格，指定多个时用空格分隔。
        "..."	DeepSeek "精确短语"	精确匹配指定短语，指定多个时用空格分隔。
        lang:	DeepSeek lang:zh,en	将结果限制在指定语言，多种语言用逗号分隔，例如 lang:zh,en。
        after:	DeepSeek after:2025 或 DeepSeek after:2025-01-01	将结果限制在指定日期之后发布的网页。
        before:	DeepSeek before:2026 或 DeepSeek before:2026-06-01	将结果限制在指定日期之前发布的网页。
    Return - results 中每一项包含以下字段：

        字段	类型	说明
        rerank_score	number	排序分数，0～3 分，综合考虑相关性、权威性、时效性等维度，大于等于 1.5 分为优质结果。
        title	string	标题。
        url	string	结果链接。
        snippet	string	短摘要，与 query 相关，通常为 100～200 字符，适用于前端展现。
        summary	string	长摘要，与 query 相关，通常为 600～800 字符，适用于给模型阅读。
        content	string	网页正文，need_content 为 false 或正文缺失时为空字符串。
        site_name	string 或 null	站点名称，缺失时为 null。
        site_icon	string 或 null	站点图标 URL，缺失时为 null。
        date	string 或 null	发布时间，统一为 UTC 的 RFC 3339 格式，未知时为 null。
        authority	integer	网页权威性，0～4（-1 表示未知），大于等于 3 为极权威结果。
    """
    from core_model import llm_mgr
    api_key = llm_mgr.agentai().apikey
    response = requests.post(
        "https://api.deepseek.com/v1/tools/search",
        headers={
            "Authorization": f"Bearer {api_key}",
        },
        json={
            "query": query,
            "count": count,
            "ori_question":ori_question,
            "localization":localization,
            "need_content": need_content,
        },
    )
    response.raise_for_status()

    return response.json()

def fetch(url):

    response = requests.post(
        "https://api.deepseek.com/v1/tools/fetch",
        headers={
            "Authorization": "Bearer <DeepSeek API Key>",
        },
        json={"url": url},
    )
    response.raise_for_status()

    page = response.json()
    print(page["title"])
    print(page["content"])



@tool
def restart_agent() -> str:
    """重启智能体 Web 服务。
    通常在智能体修改了自己的代码后调用。
    注意：调用后当前会话会断开，需刷新浏览器重新连接。
    
    Returns:
        重启提示信息
    """
    import subprocess
    import sys
    from pathlib import Path
    
    agent_dir = Path(__file__).resolve().parent
    
    try:
        if sys.platform == "win32":
            subprocess.Popen(
                [sys.executable, str(agent_dir / "restart_agent.py")],
                cwd=str(agent_dir),
                creationflags=subprocess.CREATE_NEW_CONSOLE
            )
        else:
            subprocess.Popen(
                [sys.executable, str(agent_dir / "restart_agent.py")],
                cwd=str(agent_dir),
                start_new_session=True
            )
        
        return (
            "🔄 正在重启 Web 服务...\n"
            "旧进程将在 2 秒后关闭，新进程会自动启动。\n"
            "请刷新浏览器页面重新连接。"
        )
        
    except Exception as e:
        return f"❌ 重启失败：{str(e)}"


@tool
def ip_location(ip: str = "") -> str:
    """查询 IP 地址的地理位置信息。
    如果不传 IP 地址，则查询当前设备的外网 IP 和位置。
    
    Args:
        ip: 要查询的 IP 地址，如 '8.8.8.8'。留空则查询本机外网 IP。
    
    Returns:
        IP 地址的详细信息，包括国家、城市、ISP 等
    """
    
    try:
        if ip:
            response = requests.get(
                f"http://ip-api.com/json/{ip}?lang=zh-CN",
                timeout=10
            )
        else:
            ip_response = requests.get("http://ip-api.com/json/?lang=zh-CN", timeout=10)
            data = ip_response.json()
            if data.get("status") == "success":
                ip = data.get("query", "未知")
            else:
                return f"❌ 获取本机 IP 失败：{data.get('message', '未知错误')}"
            
            response = ip_response
        
        data = response.json()
        
        if data.get("status") != "success":
            return f"❌ 查询失败：{data.get('message', '未知错误')}"
        
        result = f"📍 IP 地理位置信息\n"
        result += f"{'─'*40}\n"
        result += f"  IP 地址：{data.get('query', '未知')}\n"
        result += f"  国　　家：{data.get('country', '未知')}\n"
        result += f"  地　　区：{data.get('regionName', '未知')}\n"
        result += f"  城　　市：{data.get('city', '未知')}\n"
        result += f"  邮政编码：{data.get('zip', '未知')}\n"
        result += f"  经纬度：{data.get('lat', '未知')}, {data.get('lon', '未知')}\n"
        result += f"  时　　区：{data.get('timezone', '未知')}\n"
        result += f"  ISP：{data.get('isp', '未知')}\n"
        result += f"  组　　织：{data.get('org', '未知')}\n"
        result += f"  AS：{data.get('as', '未知')}\n"
        
        return result
        
    except requests.exceptions.Timeout:
        return "⏰ 查询超时，请稍后重试"
    except requests.exceptions.ConnectionError:
        return "❌ 网络连接失败，请检查网络"
    except Exception as e:
        return f"❌ 查询失败：{str(e)}"


@tool
def fetch_webpage(url: str) -> str:
    """读取指定网页的文本内容。用于获取在线文档、参考文章等。
    
    Args:
        url: 完整的网页地址，如 'https://docs.example.com/guide'
    
    Returns:
        网页的文本内容，或错误信息
    """
    
    if not url.startswith(('http://', 'https://')):
        return "❌ 请提供完整的网页地址（以 http:// 或 https:// 开头）"
    
    try:
        response = requests.get(
            url,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            },
            timeout=15
        )
        
        if response.status_code != 200:
            return f"❌ 网页返回状态码 {response.status_code}"
        
        # 提取文本内容
        from html.parser import HTMLParser
        
        class TextExtractor(HTMLParser):
            def __init__(self):
                super().__init__()
                self.text = []
                self.skip_tags = {'script', 'style', 'noscript', 'iframe'}
                self.current_tag = None
            
            def handle_starttag(self, tag, attrs):
                self.current_tag = tag
            
            def handle_endtag(self, tag):
                self.current_tag = None
            
            def handle_data(self, data):
                if self.current_tag not in self.skip_tags:
                    text = data.strip()
                    if text:
                        self.text.append(text)
        
        extractor = TextExtractor()
        extractor.feed(response.text)
        
        content = '\n'.join(extractor.text)
        
        # 限制长度
        if len(content) > 30000:
            content = content[:30000] + "\n\n... [网页内容过长，已截断，只显示前 30000 字符]"
        
        if not content.strip():
            return "⚠️ 未能提取到有效文本内容，该页面可能是纯 JavaScript 渲染的"
        
        return f"✅ 网页内容（{url}）：\n\n{content}"
        
    except Exception as e:
        return f"❌ 读取网页失败：{str(e)}"


# ============ 所有可用工具列表 ============
ALL_TOOLS = [read_file, write_file, run_command, check_balance, git_commit, git_status, ip_location, fetch_webpage, text_to_image, deepseek_search]

if __name__ == "__main__":
    resp = text_to_image.invoke('picture 1中的女孩穿着picture 2中的女孩的衣服',
            images=['https://platform-outputs.agnes-ai.space/images/t2i/task_vadlWyDH7ezAtOrxJIR7vZcqL5Tu1rZR/output_0fb96b64a3e046919a5803e052b4255e.png',
                    'https://platform-outputs.agnes-ai.space/images/t2i/task_G8G4a2UKmWVPq4zHoQnRLRX3VFmA21Tu/output_02c8265497c449c3adf151c2d64045cc.png'])
    print(f'resp={resp}')