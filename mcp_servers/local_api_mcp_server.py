import logging
import sys

# 强制所有 logging 输出到 stderr
# 依赖版本要求 pip install "fastmcp>=3.2.4,<4.0.0" "mcp>=1.27.0,<2.0.0"
# 禁止相关代码 使用print,防止MCP客户端使用出现不明log影响使用
logging.basicConfig(
    level=logging.INFO,
    stream=sys.stderr,
    format="%(asctime)s - [%(name)s.%(funcName)s] - %(message)s",
)
# local_api_mcp_server.py
from fastmcp import FastMCP
from excel_reader import getUsers
from mcp_douyin.douyin import Douyin

mcp = FastMCP("MyLocalAPI")

# ============ 全局限制常量 ============
DEFAULT_LIMIT = 20          # 默认返回条数
MAX_LIMIT = 100             # 单次最多返回条数
MAX_FIELD_LEN = 100         # 单个字段最大字符数（防止某个字段超长）


def _safe_str(value, max_len: int = MAX_FIELD_LEN) -> str:
    """把任意值安全地转成字符串，并截断到 max_len"""
    if value is None:
        return ""
    s = str(value)
    if len(s) > max_len:
        return s[:max_len] + "...(截断)"
    return s


def _user_to_dict(user) -> dict:
    """把用户对象转成精简的 dict，避免携带无用字段和 key_map"""
    return {
        "Full_Name": _safe_str(getattr(user, "Full_Name", "")),
        "Title": _safe_str(getattr(user, "Title", "")),
        "Staff_ID": _safe_str(getattr(user, "Staff_ID", "")),
        "IT_Code": _safe_str(getattr(user, "IT_Code", "")),
        "Working_Country": _safe_str(getattr(user, "Working_Country", "")),
        "Hire_Company": _safe_str(getattr(user, "Hire_Company", "")),
        "Business_Unit": _safe_str(getattr(user, "Business_Unit", "")),
        "Created_On": _safe_str(getattr(user, "Created_On", "")),
    }

@mcp.tool()
def local_douyin_get_hot_search():
    """获取抖音热搜"""
    # 获取数据
    dy = Douyin()
    # 热搜
    searches, resp = dy.get_hot_search()
    return searches

@mcp.tool()
def local_douyin_get_hot_star():
    """获取抖音明星榜"""
    dy = Douyin()
    # 明星
    stars, resp = dy.get_hot_star()
    return stars

@mcp.tool()
def local_douyin_get_hot_live():
    """获取抖音直播榜"""
    dy = Douyin()
    # 明星
    lives, resp = dy.get_hot_live()
    return lives

@mcp.tool()
def local_douyin_get_hot_music():
    """获取抖音音乐榜"""
    dy = Douyin()
    # 明星
    musics, resp = dy.get_hot_music()
    return musics
@mcp.tool()
def local_get_user_info(user_id: int) -> str:
    """根据用户ID查询用户信息, 仅限于查询LPS用户, 明确查找LPS用户时调用
    查询 LPS 用户信息。
    
    适用场景（必须满足以下之一才调用）：
    - 用户明确提到 "LPS"、"LPS 用户"、"LPS 员工"
    - 用户明确提到 LPS 相关的 Staff ID / IT Code
    
    不适用场景（不要调用）：
    - 查询普通用户、客户、外部联系人
    - 用户没有提到 "LPS"
    """
    # 调用你的本地 API / 业务逻辑
    users = getUsers()
    user = next((u for u in users if u.id == user_id), None)
    if user is None:
        return f"User {user_id} not found"
    info = _user_to_dict(user)
    return f"User {user_id}: " + ", ".join(f"{k}={v}" for k, v in info.items() if v)


@mcp.tool()
def local_get_all_userinfo(limit: int = DEFAULT_LIMIT, offset: int = 0) -> dict:
    """
    查询用户信息, 仅限于查询LPS用户, 明确查找LPS用户时调用
    默认返回前 20 条，单次最多 100 条。
    适用场景（必须满足以下之一才调用）：
        - 用户明确提到 "LPS"、"LPS 用户"、"LPS 员工"
        - 用户明确提到 LPS 相关的 Staff ID / IT Code
        
        不适用场景（不要调用）：
        - 查询普通用户、客户、外部联系人
        - 用户没有提到 "LPS"

    Args:
        limit: 返回条数（1-100），默认 20
        offset: 起始偏移量，默认 0
    """
    # 参数校验和限制
    limit = max(1, min(int(limit), MAX_LIMIT))
    offset = max(0, int(offset))

    users = getUsers()
    total = len(users)
    page = users[offset: offset + limit]

    # Full Name	|Title|	Staff ID|	IT Code	|Working Country|	Hire Company	|Business Unit|	Created On
    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "returned": len(page),
        "has_more": offset + limit < total,
        "users": [_user_to_dict(u) for u in page],
    }


@mcp.tool()
def local_search_user(keyword: str, limit: int = DEFAULT_LIMIT) -> dict:
    """
    根据关键字搜索用户信息, 仅限于查询LPS用户, 明确查找LPS用户时调用
    适用场景（必须满足以下之一才调用）：
        - 用户明确提到 "LPS"、"LPS 用户"、"LPS 员工"
        - 用户明确提到 LPS 相关的 Staff ID / IT Code
        
        不适用场景（不要调用）：
        - 查询普通用户、客户、外部联系人
        - 用户没有提到 "LPS"
    默认返回前 20 条匹配结果，单次最多 100 条。

    Args:
        keyword: 搜索关键字（不区分大小写）
        limit: 返回条数（1-100），默认 20
    """
    if not keyword or not keyword.strip():
        return {"error": "keyword 不能为空", "users": []}

    keyword_lower = keyword.strip().lower()
    limit = max(1, min(int(limit), MAX_LIMIT))

    users = getUsers()
    matchedUsers = []
    for user in users:
        for attr in vars(user):
            if attr.startswith("_"):        # 跳过 _key_map 之类的内部属性
                continue
            if keyword_lower in str(getattr(user, attr)).lower():
                matchedUsers.append(user)
                break
        if len(matchedUsers) >= limit:
            break

    # Full Name	|Title|	Staff ID|	IT Code	|Working Country|	Hire Company	|Business Unit|	Created On
    return {
        "keyword": keyword,
        "matched_count": len(matchedUsers),
        "limit": limit,
        "has_more": len(matchedUsers) >= limit,
        "users": [_user_to_dict(u) for u in matchedUsers],
    }


@mcp.tool()
def local_create_order(product: str, quantity: int) -> str:
    """创建新订单, 仅创建LPS订单"""
    return f"Order created: {quantity} x {product}"

# ===== 测试入口 =====
if __name__ == "__main__":
    mcp.run()  # stdio 传输，适合本地工具
