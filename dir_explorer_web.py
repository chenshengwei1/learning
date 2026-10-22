import os
import json
from http.server import HTTPServer, BaseHTTPRequestHandler

SCAN_ROOT = r"D:\doc"  # 修改成你要扫描的目录，例如你的U盘

def bytes_human(size: int) -> str:
    """字节转人类可读GB/MB/KB"""
    units = ["B", "KB", "MB", "GB", "TB"]
    val = float(size)
    for u in units:
        if val < 1024:
            return f"{val:.2f} {u}"
        val /= 1024
    return f"{val:.2f} PB"


def scan_dir(path: str):
    """递归扫描目录，返回树形dict"""
    total_size = 0
    file_count = 0
    dir_count = 0
    children = []

    try:
        entries = list(os.scandir(path))
    except PermissionError:
        return {
            "name": os.path.basename(path),
            "is_dir": True,
            "size": 0,
            "size_str": "0 B",
            "file_cnt": 0,
            "dir_cnt": 0,
            "children": [],
            "error": "权限拒绝"
        }

    for entry in entries:
        try:
            if entry.is_dir(follow_symlinks=False):
                sub = scan_dir(entry.path)
                children.append(sub)
                total_size += sub["size"]
                file_count += sub["file_cnt"]
                dir_count += 1 + sub["dir_cnt"]
            elif entry.is_file(follow_symlinks=False):
                fsize = entry.stat(follow_symlinks=False).st_size
                children.append({
                    "name": entry.name,
                    "is_dir": False,
                    "size": fsize,
                    "size_str": bytes_human(fsize)
                })
                total_size += fsize
                file_count += 1
        except Exception:
            continue

    return {
        "name": os.path.basename(path),
        "is_dir": True,
        "size": total_size,
        "size_str": bytes_human(total_size),
        "file_cnt": file_count,
        "dir_cnt": dir_count,
        "children": children
    }


HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>目录树形统计查看器</title>
<style>
body {font-family: Consolas,微软雅黑;font-size:14px;padding:16px;}
.tree-node{margin:4px 0;padding-left:24px;user-select:none;}
.folder{color:#2b7cd3;font-weight:bold;cursor:pointer;}
.file{color:#444;}
.info-text{color:#666;font-size:12px;margin-left:8px;}
.loading{color:#888;}
</style>
</head>
<body>
<h2>目录统计树形浏览器</h2>
<div id="container"><span class="loading">正在加载数据...</span></div>

<script>
const rootData = {{root_json}};

function renderNode(node){
    let html = "";
    if(node.is_dir){
        html += `<div class="tree-node">
            <span class="folder" onclick="toggle(this)">▶ ${node.name}</span>
            <span class="info-text">文件:${node.file_cnt} | 子目录:${node.dir_cnt} | 总大小:${node.size_str}</span>`;
        if(node.error){
            html += `<span style="color:red">【${node.error}】</span>`
        }
        html += `<div class="children" style="display:none">`;
        for(let child of node.children){
            html += renderNode(child);
        }
        html += `</div></div>`;
    }else{
        html += `<div class="tree-node file">📄 ${node.name} <span class="info-text">${node.size_str}</span></div>`
    }
    return html;
}

function toggle(el){
    const childDiv = el.nextElementSibling.nextElementSibling;
    if(el.textContent.startsWith("▶")){
        el.textContent = el.textContent.replace("▶","▼");
        childDiv.style.display = "block";
    }else{
        el.textContent = el.textContent.replace("▼","▶");
        childDiv.style.display = "none";
    }
}

document.querySelector("#container").innerHTML = renderNode(rootData);
</script>
</body>
</html>
"""


class MyHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-Type", "text/html;charset=utf-8")
        self.end_headers()
        print(f"开始扫描目录: {SCAN_ROOT} ...")
        tree_data = scan_dir(SCAN_ROOT)
        json_str = json.dumps(tree_data, ensure_ascii=False)
        page = HTML_TEMPLATE.replace("{{root_json}}", json_str)
        self.wfile.write(page.encode("utf-8"))

    def log_message(self, format, *args):
        return


if __name__ == "__main__":
    server = HTTPServer(("127.0.0.1", 8000), MyHandler)
    print(f"服务启动，访问 http://127.0.0.1:8000")
    print(f"待扫描目录：{SCAN_ROOT}")
    print("⚠️首次打开网页会执行完整扫描，百万文件会需要一点时间")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n停止服务")
