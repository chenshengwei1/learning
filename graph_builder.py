# graph_builder.py
import yaml
import importlib
from langgraph.graph import StateGraph, END
from typing import Type, Dict, Any

class GraphBuilder:
    """根据 YAML 配置动态构建 StateGraph"""
    
    def __init__(self, config_path: str = "graph_config.yaml"):
        self.config_path = config_path
        self.config = self._load_config()
    
    def _load_config(self) -> dict:
        with open(self.config_path, 'r', encoding='utf-8') as f:
            return yaml.safe_load(f)
    
    def _import_function(self, code_path: str):
        """动态导入函数"""
        if not code_path:
            return None
        module_path, func_name = code_path.rsplit('.', 1)
        module = importlib.import_module(module_path)
        return getattr(module, func_name)
    
    def build(self, state_class: Type) -> Any:
        """构建 StateGraph"""
        workflow = StateGraph(state_class)
        config = self.config
        
        # 1. 添加所有节点
        for node_config in config['nodes']:
            node_id = node_config['id']
            func = self._import_function(node_config.get('code'))
            
            if func:
                workflow.add_node(node_id, func)
            else:
                # 占位节点（用于可视化）
                workflow.add_node(node_id, lambda s: {})
        
        # 2. 添加边
        for edge in config['edges']:
            from_node = edge['from']
            to_node = edge['to']
            
            # 检查是否为条件边
            source_config = next(
                (n for n in config['nodes'] if n['id'] == from_node), 
                {}
            )
            
            if source_config.get('type') == 'router':
                # 条件边：需要路由函数
                router_func = self._import_function(source_config.get('code'))
                routes = source_config.get('routes', {})
                if router_func:
                    workflow.add_conditional_edges(from_node, router_func, routes)
            else:
                workflow.add_edge(from_node, to_node)
        
        # 3. 设置入口
        entry = config.get('entry')
        if entry:
            workflow.set_entry_point(entry)
        
        return workflow.compile()

# ===== 使用方式：Agent 启动时构建 =====
class AgentApp:
    def __init__(self, config_path: str = "graph_config.yaml"):
        self.config_path = config_path
        self.builder = GraphBuilder(config_path)
    
    async def compile(self, state_class, checkpointer):
        """编译完整的 Agent 图"""
        # 1. 构建 LLM 子图（从 YAML）
        llm_subgraph = self.builder.build(state_class)
        
        # 2. 构建主图
        workflow = StateGraph(state_class)
        workflow.add_node("agent", llm_subgraph)
        workflow.add_node("tools", execute_tools)  # 你的工具节点
        
        workflow.set_entry_point("agent")
        workflow.add_conditional_edges(
            "agent", 
            route_tools, 
            {"tools": "tools", END: END}
        )
        workflow.add_edge("tools", "agent")
        
        # 3. 编译
        app = workflow.compile(checkpointer=checkpointer)
        return app

# ===== 实际使用 =====
async def main():
    # 每次启动时读取 YAML 构建图
    agent_app = AgentApp("graph_config.yaml")
    
    DB_PATH = os.path.join(os.path.dirname(__file__), "agent_memory.db")
    conn = await aiosqlite.connect(DB_PATH)
    memory = AsyncSqliteSaver(conn)
    
    app = await agent_app.compile(AgentState, memory)
    return app