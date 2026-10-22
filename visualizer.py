import yaml
import re
from pathlib import Path
import datetime
from jinja2 import Template

class GraphVisualizer:
    def __init__(self, config_path: str = "graph_config.yaml"):
        self.config_path = config_path
        self.config = self._load_config(config_path)
    
    def _load_config(self, config_path: str) -> dict:
        with open(config_path, 'r', encoding='utf-8') as f:
            return yaml.safe_load(f)
    
    def _sanitize_id(self, node_id: str) -> str:
        """✅ 简化：统一用引号包裹"""
        if not node_id:
            return ''
        return f'{node_id}'
    
    def _escape_label(self, label: str) -> str:
        """转义标签中的特殊字符"""
        if not label:
            return ''
        cleaned = re.sub(r'[^\w\u4e00-\u9fff\s\-：，。、()]', '', str(label))
        return cleaned.strip()
    
    def generate_mermaid_with_subgraphs(self, config: dict, level: int = 0) -> str:
        """生成包含子图的 Mermaid 代码"""
        lines = []
        indent = "    " * level
        
        if level == 0:
            lines.append("flowchart TD")
            lines.append("    %% 自动生成的 Mermaid 图")

            entry = config.get('entry', 'agent')
            lines.append(f'    start([开始])')
            lines.append(f'    start --> {entry}')
        
        # 先收集所有子图配置
        subgraph_configs = {}
        main_nodes = []
        
        for node in config.get('nodes', []):
            if node.get('type') == 'subgraph':
                subgraph_configs[node['id']] = node
            else:
                main_nodes.append(node)
        
        # 处理主图节点（非子图）
        for node in main_nodes:
            node_id = self._sanitize_id(node['id'])
            label = self._escape_label(node.get('name', node['id']))
            is_router = node.get('type') == 'router'
            
            if is_router:
                lines.append(f'{indent}    {node_id}{{{label}}}')
            else:
                lines.append(f'{indent}    {node_id}[{label}]')
        
        # ✅ 处理子图 - 修复语法
        for sub_id, sub_config in subgraph_configs.items():
            sub_label = self._escape_label(sub_config.get('name', sub_id))
            sub_config_path = sub_config.get('config')
            
            if sub_config_path:
                try:
                    with open(sub_config_path, 'r', encoding='utf-8') as f:
                        sub_config_data = yaml.safe_load(f)
                    
                    # ✅ 修复：正确的子图语法 subgraph id["label"]
                    lines.append(f'{indent}    subgraph {sub_id}["{sub_label}"]')
                    
                    # 递归生成子图内部节点（增加缩进）
                    sub_lines = self.generate_mermaid_with_subgraphs(sub_config_data, level + 1)
                    sub_lines_clean = []
                    for line in sub_lines.split('\n'):
                        if line.strip() and not line.strip().startswith('flowchart'):
                            sub_lines_clean.append(line)
                    
                    for line in sub_lines_clean:
                        lines.append(f'{indent}    {line}')
                    
                    lines.append(f'{indent}    end')
                    
                except Exception as e:
                    lines.append(f'{indent}    {self._sanitize_id(sub_id)}["{sub_label} (加载失败: {str(e)})"]')
        
        # 处理主图边
        for edge in config.get('edges', []):
            from_node = self._sanitize_id(edge['from'])
            to_node = self._sanitize_id(edge['to'])
            label = self._escape_label(edge.get('label', ''))
            if to_node == '__end__':
                if level == 0:
                    if label:
                        lines.append(f'{indent}    {from_node} -->|{label}| END')
                    else:
                        lines.append(f'{indent}    {from_node} --> END')
            elif label:
                lines.append(f'{indent}    {from_node} -->|{label}| {to_node}')
            else:
                lines.append(f'{indent}    {from_node} --> {to_node}')
        
        # 处理主图路由
        for router in config.get('routers', []):
            from_node = self._sanitize_id(router['from'])
            for route, target in router.get('routes', {}).items():
                label = route.replace('__', '').replace('_', ' ')
                target_clean = self._sanitize_id(target)
                
                if target == '__end__':
                    # END 节点特殊处理
                    if level == 0:
                        if label:
                            lines.append(f'{indent}    {from_node} -->|{label}| END')
                        else:
                            lines.append(f'{indent}    {from_node} --> END')
                elif label:
                    lines.append(f'{indent}    {from_node} -->|{label}| {target_clean}')
                else:
                    lines.append(f'{indent}    {from_node} --> {target_clean}')

        # ✅ 如果是子图（level > 0），标记入口节点
        if level > 0:
            sub_entry = config.get('entry')
            if sub_entry:
                # 找到入口节点，用高亮样式标记
                lines.append(f'    style {sub_entry} fill:#00d4ff,stroke:#00d4ff,stroke-width:2px,color:#000')

            # ✅ 子图：找到最后一个节点，标记为出口
            # ✅ 找出所有连接到 END 的出口节点
            exit_nodes = self._find_exit_nodes(config)
            for exit_node in exit_nodes:
                lines.append(f'    style {exit_node} fill:#ff6b6b,stroke:#ff6b6b,stroke-width:2px,color:#fff')

        return "\n".join(lines)

    def _find_exit_nodes(self, config: dict) -> list:
        """找出子图中所有连接到 END 的节点"""
        exits = []
        for edge in config.get('edges', []):
            if edge.get('to') == '__end__':
                exits.append(edge['from'])
        # 也检查路由中的 __end__
        for router in config.get('routers', []):
            for route, target in router.get('routes', {}).items():
                if target == '__end__':
                    exits.append(router['from'])
        return list(set(exits))  # 去重
    
    def generate_mermaid(self) -> str:
        """生成 Mermaid 代码"""
        result = self.generate_mermaid_with_subgraphs(self.config, level=0)
        
        with open("debug_mermaid.mmd", "w", encoding='utf-8') as f:
            f.write(result)
        print("✅ Mermaid 代码已保存到 debug_mermaid.mmd")
        print(f"📊 代码长度: {len(result)} 字符, {len(result.split(chr(10)))} 行")
        
        return result
    
    def reload(self):
        self.config = self._load_config(self.config_path)
    
    def generate_html(self) -> str:
        """生成 HTML 页面"""
        mermaid_code = self.generate_mermaid()
    
        
        return f'''<!DOCTYPE html>
<html>
<head>
    <title>{self.config.get('name', 'Agent图')} - 图结构</title>
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
    <style>
        body {{ font-family: 'Segoe UI', sans-serif; background: #0f0f23; color: #eee; padding: 20px; }}
        .container {{ max-width: 1400px; margin: 0 auto; background: #16213e; border-radius: 12px; padding: 20px; }}
        h1 {{ color: #00d4ff; border-bottom: 2px solid #00d4ff; padding-bottom: 10px; }}
        .mermaid {{ background: #0f0f23; padding: 20px; border-radius: 8px; text-align: center; overflow-x: auto; }}
        .mermaid svg {{ max-width: 100%; }}
        .error-msg {{ color: #ff6b6b; background: #1a1a3e; padding: 20px; border-radius: 8px; margin: 20px 0; white-space: pre-wrap; }}
        .refresh-btn {{
            background: #00d4ff; color: #000; border: none;
            padding: 8px 20px; border-radius: 20px; cursor: pointer;
            font-weight: bold;
        }}
        .refresh-btn:hover {{ background: #00b8d4; }}
        .update-time {{ color: #888; font-size: 14px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
            <div>
                <h1>📊 {self.config.get('name', 'Agent图')}</h1>
                <span class="update-time">最后更新: {datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")}</span>
            </div>
            <button class="refresh-btn" onclick="location.reload()">🔄 刷新</button>
        </div>
        
        <div id="error-container" class="error-msg" style="display:none;"></div>
        
        <pre class="mermaid" id="mermaid-container" style="text-align:left; white-space:pre-wrap; word-break:break-all;">
{mermaid_code}</pre>
    </div>
    
    <script>
        document.addEventListener('DOMContentLoaded', function() {{
            mermaid.initialize({{
                theme: 'dark',
                themeVariables: {{
                    primaryColor: '#00d4ff',
                    primaryTextColor: '#fff',
                    primaryBorderColor: '#00d4ff',
                    lineColor: '#00d4ff',
                    secondaryColor: '#1a1a3e',
                    tertiaryColor: '#0f0f23'
                }}
            }});
            
            mermaid.run({{
                nodes: document.querySelectorAll('.mermaid')
            }}).catch(function(err) {{
                if (err.message && err.message.includes('already rendered')) {{
                    return;
                }}
                const container = document.getElementById('error-container');
                if (container) {{
                    container.textContent = '⚠️ Mermaid 警告:\\n' + (err.message || err);
                    container.style.display = 'block';
                }}
                console.warn('Mermaid:', err);
            }});
        }});
    </script>
</body>
</html>'''

# ===== FastAPI 路由 =====
visualizer = GraphVisualizer("config/main_graph.yaml")

def show_graph():
    return visualizer.generate_html()

def reload():
    visualizer.reload()
    return {"status": "ok", "message": "配置已重新加载"}