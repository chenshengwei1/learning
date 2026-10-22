from typing import Dict
import CheapLLM
import SkillPackageLoader


def generate_skill_description_from_package(skill_package_info: Dict) -> str:
    """
    输入：技能包加载器返回的完整信息
    输出：一段50-100字的精简描述（用于System Prompt）
    """
    readme = skill_package_info["readme"]
    code_summary = skill_package_info["code_summary"]
    skill_name = skill_package_info["name"]
    
    # 策略1：如果README里有明确的"简介"段落，直接截取
    if "## 简介" in readme:
        import re
        match = re.search(r'## 简介\s*\n(.*?)(?=\n##|\Z)', readme, re.DOTALL)
        if match:
            return match.group(1).strip()
    
    # 策略2：如果README第一段是自然语言描述，取前100字
    if readme.strip():
        first_paragraph = readme.split('\n\n')[0].strip()
        if len(first_paragraph) > 10:
            return first_paragraph[:150] + ("..." if len(first_paragraph) > 150 else "")
    
    # 策略3：让LLM根据代码骨架生成（兜底方案）
    generation_prompt = f"""
    你是一个AI技能文档专家。
    以下是一个技能的信息：
    - 技能名称：{skill_name}
    - 内部调用的函数：{', '.join(code_summary.get('internal_calls', [])[:10])}
    - 是否包含错误处理：{code_summary.get('has_error_handling', False)}
    - 是否调用LLM：{code_summary.get('has_llm_call', False)}
    
    请生成一段50字以内的技能描述，用于让智能体判断用户是否应该触发该技能。
    描述要口语化、场景化，面向意图匹配。
    直接输出描述，不要输出其他内容。
    """
    
    # 用便宜模型生成
    response = CheapLLM().chat(generation_prompt)
    return response.strip()


def loadSkill() -> str:
    # 系统启动时
    loader = SkillPackageLoader("./skills")
    all_skills = loader.load_all_skills()

    # 为每个技能生成精简描述
    for skill_name, pkg_info in all_skills.items():
        short_desc = generate_skill_description_from_package(pkg_info)
        
        # 注册到注册中心
        skill_registry.register(
            name=skill_name,
            description=short_desc,   # ← 这里放自动生成的描述
            executor_path=pkg_info["entry_point"],
            full_readme=pkg_info["readme"],  # 可选：完整文档供调试
        )

    # 每次调用LLM时，只把短描述放入System Prompt
    skills_for_llm = skill_registry.get_skills_for_llm()  # 只含 name + short_desc
    system_prompt = f"你可以使用以下技能：\n{json.dumps(skills_for_llm)}"
    return system_prompt