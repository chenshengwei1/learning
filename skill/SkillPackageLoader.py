# skill_package_loader.py
import os
import re
import json
from pathlib import Path
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field


@dataclass
class SkillPackageInfo:
    """技能包信息（从文件夹读取）"""
    name: str
    path: Path
    readme_path: Path
    main_py_path: Optional[Path]
    config_path: Optional[Path]
    readme_content: str
    description: str  # 从 SKILL 提取的 description
    has_description: bool  # 是否已有有效描述


class SkillPackageLoader:
    """
    技能包加载器：扫描技能文件夹，读取 SKILL.md，
    检查 description 是否为空，必要时调用 LLM 生成。
    """
    
    def __init__(self, skills_root: str = "./skills"):
        self.skills_root = Path(skills_root)
        self._llm_client = None  # 延迟初始化
    
    def scan_and_fill(self, llm_client=None) -> int:
        """
        扫描所有技能，为缺少 description 的生成描述
        :param llm_client: 大模型客户端（用于生成描述）
        :return: 更新的技能数量
        """
        if llm_client:
            self._llm_client = llm_client
        
        if not self.skills_root.exists():
            print(f"⚠️ 技能目录不存在: {self.skills_root}")
            return 0
        
        skill_dirs = [d for d in self.skills_root.iterdir() if d.is_dir()]
        updated_count = 0
        
        for skill_dir in skill_dirs:
            skill_name = skill_dir.name
            if skill_name.startswith("_") or skill_name.startswith("."):
                continue
            
            try:
                # 加载技能包信息
                pkg_info = self._load_package_info(skill_dir)
                if pkg_info is None:
                    continue
                
                # 检查是否需要生成描述
                if not pkg_info.has_description:
                    print(f"  📝 技能 [{skill_name}] 缺少描述，正在生成...")
                    new_description = self._generate_description(pkg_info)
                    if new_description:
                        self._write_description_to_readme(pkg_info, new_description)
                        updated_count += 1
                        print(f"  ✅ 技能 [{skill_name}] 描述已更新")
                    else:
                        print(f"  ⚠️ 技能 [{skill_name}] 描述生成失败")
                else:
                    print(f"  ℹ️ 技能 [{skill_name}] 已有描述，跳过")
                    
            except Exception as e:
                print(f"  ❌ 处理技能 [{skill_name}] 失败: {e}")
        
        print(f"📦 共处理 {len(skill_dirs)} 个技能，更新 {updated_count} 个描述")
        return updated_count
    
    def _load_package_info(self, skill_dir: Path) -> Optional[SkillPackageInfo]:
        """加载单个技能包的信息"""
        skill_name = skill_dir.name
        
        # 检查 SKILL.md
        readme_path = skill_dir / "SKILL.md"
        if not readme_path.exists():
            print(f"  ⚠️ 技能 [{skill_name}] 缺少 SKILL.md")
            return None
        
        readme_content = readme_path.read_text(encoding="utf-8")
        
        # 提取 description（从 "## 简介" 段落或第一段）
        description = self._extract_description(readme_content)
        has_description = self._is_valid_description(description)
        
        # 检查 main.py（存在即可，不强制）
        main_py_path = skill_dir / "main.py"
        config_path = skill_dir / "config.yaml" if (skill_dir / "config.yaml").exists() else None
        
        return SkillPackageInfo(
            name=skill_name,
            path=skill_dir,
            readme_path=readme_path,
            main_py_path=main_py_path if main_py_path.exists() else None,
            config_path=config_path,
            readme_content=readme_content,
            description=description,
            has_description=has_description
        )
    
    def _extract_description(self, readme_content: str) -> str:
        """从 README 提取描述文本"""
        # 优先取 "## 简介" 段落
        match = re.search(r'##\s*简介\s*\n(.*?)(?=\n##|\Z)', readme_content, re.DOTALL | re.IGNORECASE)
        if match:
            desc = match.group(1).strip()
            # 取第一段
            desc = desc.split('\n\n')[0].strip()
            return desc
        
        # 否则取第一个非空行
        lines = [line.strip() for line in readme_content.split('\n') if line.strip()]
        if lines:
            return lines[0]
        
        return ""
    
    def _is_valid_description(self, description: str) -> bool:
        """判断描述是否有效（不为空且不是占位符）"""
        if not description:
            return False
        # 排除常见的占位符
        invalid_patterns = [
            r'^待补充$',
            r'^TODO',
            r'^无描述',
            r'^请补充',
            r'^description',
            r'^技能描述',
            r'^描述',
            r'^暂无',
        ]
        for pattern in invalid_patterns:
            if re.match(pattern, description, re.IGNORECASE):
                return False
        # 描述至少要有 10 个字符
        return len(description.strip()) >= 10
    
    def _generate_description(self, pkg_info: SkillPackageInfo) -> Optional[str]:
        """
        调用大模型生成技能描述
        如果未注入 llm_client，则使用默认的生成逻辑（或报错）
        """
        if self._llm_client is None:
            # 如果没有注入 LLM 客户端，可以使用一个简单的兜底方案
            # 这里抛异常，让调用方决定如何处理
            raise RuntimeError("未注入 LLM 客户端，无法生成描述")
        
        # 收集代码信息（如果 main.py 存在）
        code_info = self._extract_code_info(pkg_info)
        
        # 构建 Prompt
        prompt = self._build_generation_prompt(pkg_info, code_info)
        
        try:
            # 调用 LLM 生成描述
            response = self._llm_client.chat(
                user_prompt=prompt,
                system_prompt="你是一个 AI 技能文档专家。请根据技能信息生成一段 30-50 字的简短描述，用于意图匹配。描述要口语化、场景化。",
                temperature=0.3,
                max_tokens=100
            )
            # 清理响应（去除多余的空格、换行、引号）
            description = response.strip()
            if description.startswith('"') and description.endswith('"'):
                description = description[1:-1]
            if description.startswith("'") and description.endswith("'"):
                description = description[1:-1]
            return description if len(description) >= 5 else None
        except Exception as e:
            print(f"  ❌ LLM 生成失败: {e}")
            return None
    
    def _extract_code_info(self, pkg_info: SkillPackageInfo) -> Dict[str, Any]:
        """从 main.py 提取代码骨架信息"""
        if not pkg_info.main_py_path or not pkg_info.main_py_path.exists():
            return {"functions": [], "internal_calls": [], "has_llm_call": False}
        
        try:
            source = pkg_info.main_py_path.read_text(encoding="utf-8")
            import ast
            tree = ast.parse(source)
            
            functions = []
            internal_calls = []
            
            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef):
                    functions.append(node.name)
                elif isinstance(node, ast.Call):
                    if isinstance(node.func, ast.Name):
                        internal_calls.append(node.func.id)
                    elif isinstance(node.func, ast.Attribute):
                        internal_calls.append(node.func.attr)
            
            return {
                "functions": list(set(functions)),
                "internal_calls": list(set(internal_calls))[:20],  # 限制数量
                "has_llm_call": any('llm' in c.lower() or 'chat' in c.lower() for c in internal_calls),
                "has_error_handling": 'try' in source,
            }
        except Exception:
            return {"functions": [], "internal_calls": [], "has_llm_call": False}
    
    def _build_generation_prompt(self, pkg_info: SkillPackageInfo, code_info: Dict) -> str:
        """构建生成描述的 Prompt"""
        prompt = f"""技能名称：{pkg_info.name}

README 内容（片段）：
{self._truncate(pkg_info.readme_content, 500)}

"""
        if code_info.get("functions"):
            prompt += f"内部函数：{', '.join(code_info['functions'][:10])}\n"
        if code_info.get("internal_calls"):
            prompt += f"调用的工具：{', '.join(code_info['internal_calls'][:10])}\n"
        
        prompt += """
请生成一段 30-50 字的技能描述：
- 描述这个技能做什么
- 说明用户什么场景下会使用它
- 口语化，适合放在 System Prompt 中让 LLM 做意图匹配

直接输出描述文字，不要加标题、不要加引号、不要有多余内容。"""
        return prompt
    
    def _truncate(self, text: str, max_len: int) -> str:
        return text[:max_len] + ("..." if len(text) > max_len else "")
    
    def _write_description_to_readme(self, pkg_info: SkillPackageInfo, new_description: str):
        """
        将生成的描述写回 SKILL.md
        策略：在文件开头插入或更新 "## 简介" 段落
        """
        readme_path = pkg_info.readme_path
        content = pkg_info.readme_content
        
        # 检查是否已有 "## 简介" 段落
        match = re.search(r'##\s*简介\s*\n.*?(?=\n##|\Z)', content, re.DOTALL | re.IGNORECASE)
        
        if match:
            # 已有简介段落，替换其中的内容（保留第一段）
            old_desc = match.group(0)
            # 提取标题行
            title_match = re.match(r'(##\s*简介\s*\n)', old_desc, re.IGNORECASE)
            if title_match:
                new_section = title_match.group(1) + new_description + "\n\n"
                content = content.replace(old_desc, new_section)
        else:
            # 没有简介段落，在文件开头插入
            content = f"## 简介\n{new_description}\n\n" + content
        
        # 写回文件
        readme_path.write_text(content, encoding="utf-8")
        pkg_info.readme_content = content
        pkg_info.description = new_description
        pkg_info.has_description = True


# ===== 便捷函数 =====
def fill_skill_descriptions(skills_root: str = "./skills", llm_client=None) -> int:
    """
    一键填充所有技能的 description
    :param skills_root: 技能根目录
    :param llm_client: 大模型客户端（需实现 chat 方法）
    :return: 更新的技能数量
    """
    loader = SkillPackageLoader(skills_root)
    return loader.scan_and_fill(llm_client)