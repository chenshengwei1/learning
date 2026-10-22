# skill_registry.py
import re
import yaml
import sys
import importlib.util
from pathlib import Path
from typing import Dict, Any, Callable, Optional, List
from dataclasses import dataclass, field


@dataclass
class Skill:
    """技能数据结构 — 对应 SKILL.md 标准"""
    name: str                          # 技能名称（目录名）
    description: str                   # 从 SKILL.md frontmatter 提取
    skill_md_path: Path                # SKILL.md 文件路径
    skill_md_content: str              # SKILL.md 完整内容
    frontmatter: Dict[str, Any]        # YAML frontmatter 元数据
    execute_func: Optional[Callable] = None  # 仅当有 main.py 时存在
    input_schema: Optional[Dict[str, Any]] = None  # 仅当有 main.py 时存在
    enabled: bool = True


class SkillRegistry:
    """
    技能注册中心 — 遵循 Agent Skill 开放标准
    仅负责：扫描技能目录、加载 SKILL.md、注册技能、调度执行
    不包含任何业务工具（文件读写、邮件发送等由技能自己处理）
    """
    
    def __init__(self, skills_root: str = "./skills"):
        self.skills_root = Path(skills_root)
        self._skills: Dict[str, Skill] = {}
    
    # ======================== 公共 API ========================
    
    def register_all(self) -> int:
        """扫描并注册所有技能"""
        if not self.skills_root.exists():
            self.skills_root.mkdir(parents=True)
            print(f"📁 创建技能目录: {self.skills_root}")
            return 0
        
        skill_dirs = [d for d in self.skills_root.iterdir() if d.is_dir()]
        if not skill_dirs:
            print(f"⚠️ 技能目录为空: {self.skills_root}")
            return 0
        
        registered_count = 0
        for skill_dir in skill_dirs:
            skill_name = skill_dir.name
            if skill_name.startswith("_") or skill_name.startswith("."):
                continue
            
            try:
                skill = self._load_skill(skill_dir)
                if skill:
                    self._skills[skill_name] = skill
                    registered_count += 1
                    skill_type = "💻代码" if skill.execute_func else "📄文档"
                    print(f"  ✅ {skill_type} 技能: {skill_name} — {skill.description[:40]}...")
            except Exception as e:
                print(f"  ❌ 加载技能 {skill_name} 失败: {e}")
        
        print(f"📦 共注册 {registered_count} 个技能")
        return registered_count
    
    def get(self, skill_name: str) -> Optional[Skill]:
        """获取技能"""
        return self._skills.get(skill_name)
    
    def list_skills(self) -> List[str]:
        """列出所有技能名称"""
        return list(self._skills.keys())
    
    def get_skills_for_llm(self) -> List[Dict[str, Any]]:
        """
        生成给 LLM 的技能列表 — 用于 System Prompt
        只包含：name, description, 以及必要的调用信息
        """
        result = []
        for name, skill in self._skills.items():
            if not skill.enabled:
                continue
            entry = {
                "name": name,
                "description": skill.description,
            }
            # 如果有代码执行函数，说明需要传参
            if skill.input_schema:
                entry["parameters"] = skill.input_schema
            result.append(entry)
        return result
    
    def execute(self, skill_name: str, params: Dict[str, Any] = None) -> str:
        """
        执行技能
        - 代码技能：调用 execute_skill 函数
        - 文档技能：返回 SKILL.md 内容供 LLM 阅读
        """
        params = params or {}
        skill = self.get(skill_name)
        
        if not skill:
            return f"❌ 未知技能: {skill_name}。可用技能: {', '.join(self.list_skills())}"
        
        if not skill.enabled:
            return f"❌ 技能 {skill_name} 已禁用"
        
        # 代码技能：执行函数
        if skill.execute_func:
            try:
                return skill.execute_func(**params)
            except Exception as e:
                return f"❌ 执行技能 {skill_name} 失败: {str(e)}"
        
        # 文档技能：返回 SKILL.md 内容
        return f"📄 技能 {skill_name} 说明文档:\n\n{skill.skill_md_content}"
    
    def reload(self) -> int:
        """重新加载所有技能"""
        self._skills.clear()
        return self.register_all()
    
    # ======================== 内部加载方法 ========================
    
    def _load_skill(self, skill_dir: Path) -> Optional[Skill]:
        """加载单个技能 — 自动识别是否有 main.py"""
        skill_name = skill_dir.name
        
        # 1. 查找 SKILL.md（必需）
        skill_md_path = self._find_skill_md(skill_dir)
        if not skill_md_path:
            raise FileNotFoundError(f"未找到 SKILL.md 或 skill.md")
        
        # 2. 解析 SKILL.md
        content = skill_md_path.read_text(encoding="utf-8")
        frontmatter, body = self._parse_skill_md(content)
        
        # 3. 提取 description
        description = self._get_description(frontmatter, body, skill_name)
        
        # 4. 检测是否有 main.py（代码技能）
        main_py_path = skill_dir / "main.py"
        execute_func = None
        input_schema = None
        
        if main_py_path.exists():
            execute_func, input_schema = self._load_code_skill(main_py_path)
        
        # 5. 返回 Skill 对象
        return Skill(
            name=skill_name,
            description=description,
            skill_md_path=skill_md_path,
            skill_md_content=content,
            frontmatter=frontmatter,
            execute_func=execute_func,
            input_schema=input_schema,
            enabled=frontmatter.get("enabled", True),
        )
    
    def _find_skill_md(self, skill_dir: Path) -> Optional[Path]:
        """查找 SKILL.md（优先大写，兼容小写）"""
        candidates = ["SKILL.md", "skill.md"]
        for candidate in candidates:
            path = skill_dir / candidate
            if path.exists():
                return path
        return None
    
    def _parse_skill_md(self, content: str) -> tuple:
        """
        解析 SKILL.md
        返回: (frontmatter_dict, body_text)
        支持 YAML frontmatter（被 --- 包围）
        如果没有 frontmatter，返回 ({}, content)
        """
        frontmatter_pattern = r'^---\s*\n(.*?)\n---\s*\n(.*)$'
        match = re.search(frontmatter_pattern, content, re.DOTALL)
        
        if match:
            yaml_str = match.group(1).strip()
            body = match.group(2).strip()
            try:
                frontmatter = yaml.safe_load(yaml_str) or {}
            except yaml.YAMLError:
                frontmatter = {}
        else:
            frontmatter = {}
            body = content.strip()
        
        return frontmatter, body
    
    def _get_description(self, frontmatter: Dict, body: str, skill_name: str) -> str:
        """
        提取 description（按优先级）
        1. frontmatter 中的 description 字段（最标准）
        2. 正文中 "## 简介" 段落
        3. 正文第一段
        """
        # 优先从 frontmatter 取
        if frontmatter.get("description"):
            desc = frontmatter["description"].strip()
            return desc if desc else skill_name
        
        # 其次从 "## 简介" 段落取
        match = re.search(r'##\s*简介\s*\n(.*?)(?=\n##|\Z)', body, re.DOTALL | re.IGNORECASE)
        if match:
            desc = match.group(1).strip()
            desc = desc.split('\n\n')[0].strip()
            if desc:
                return desc[:147] + "..." if len(desc) > 150 else desc
        
        # 最后取第一段
        lines = [line.strip() for line in body.split('\n') if line.strip()]
        if lines:
            desc = lines[0]
            return desc[:147] + "..." if len(desc) > 150 else desc
        
        return skill_name
    
    def _load_code_skill(self, main_py_path: Path) -> tuple:
        """
        动态加载 main.py 中的 execute_skill 函数
        返回: (execute_func, input_schema)
        """
        skill_dir = main_py_path.parent
        parent_dir = main_py_path.parent.parent
        
        # 将父目录加入 sys.path
        if str(parent_dir) not in sys.path:
            sys.path.insert(0, str(parent_dir))
        
        module_name = f"{parent_dir.name}.{skill_dir.name}.main"
        
        try:
            spec = importlib.util.spec_from_file_location(module_name, main_py_path)
            if spec is None:
                raise ImportError(f"无法加载模块: {module_name}")
            
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            
            if not hasattr(module, 'execute_skill'):
                raise AttributeError(f"main.py 中未找到 execute_skill 函数")
            
            execute_func = getattr(module, 'execute_skill')
            input_schema = self._extract_schema(execute_func)
            return execute_func, input_schema
            
        except Exception as e:
            raise ImportError(f"加载 {main_py_path} 失败: {e}")
    
    def _extract_schema(self, func: Callable) -> Optional[Dict[str, Any]]:
        """
        从函数签名提取参数 Schema
        如果 pydantic 未安装，返回简单格式
        """
        import inspect
        
        sig = inspect.signature(func)
        params = {}
        required = []
        
        for param_name, param in sig.parameters.items():
            if param_name in ['self', 'cls']:
                continue
            param_type = param.annotation if param.annotation != inspect.Parameter.empty else str
            has_default = param.default != inspect.Parameter.empty
            params[param_name] = {
                "type": self._type_to_json_schema(param_type),
                "description": f"参数: {param_name}",
            }
            if param.default != inspect.Parameter.empty:
                params[param_name]["default"] = param.default
            if not has_default:
                required.append(param_name)
        
        return {
            "type": "object",
            "properties": params,
            "required": required
        } if params else None
    
    def _type_to_json_schema(self, py_type) -> str:
        """将 Python 类型转换为 JSON Schema 类型"""
        type_map = {
            str: "string",
            int: "integer",
            float: "number",
            bool: "boolean",
            dict: "object",
            list: "array",
        }
        return type_map.get(py_type, "string")


# ======================== 全局单例 ========================

_global_registry: Optional[SkillRegistry] = None

def get_skill_registry(skills_root: str = "./skills") -> SkillRegistry:
    """获取全局技能注册中心（单例）"""
    global _global_registry
    if _global_registry is None:
        _global_registry = SkillRegistry(skills_root)
        _global_registry.register_all()
    return _global_registry