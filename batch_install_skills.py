#!/usr/bin/env python3
"""
batch_install_skills.py

批量安装 Skill：判重 → 搜索 → 按候选依次尝试安装，失败/超时自动切换下一个。
"""

import os
import re
import subprocess
import sys
import shutil
from typing import List, Tuple, Optional, Set

# ============ 正则 ============

ANSI_ESCAPE = re.compile(r"\x1b\[[0-9;]*[A-Za-z]")

# owner/repo@skill
PATTERN_ID = re.compile(r"([\w.\-]+/[\w.\-]+)@([\w.\-]+)")

# npx skills list 输出: 技能名 路径 Agents: xxx
PATTERN_LIST_LINE = re.compile(
    r"^\s*([\w.\-]+)\s+\S+\s+Agents?:\s*.+$",
    re.MULTILINE,
)

# ============ 配置区 ============

# (搜索关键词, 回退标识)
SKILLS: List[Tuple[str, Optional[str]]] = [
    ("find-skills",     "vercel-labs/skills@find-skills"),
    ("summarize",       None),
    ("agent-browser",   None),
    ("gog",             None),
    ("github",          None),
    ("proactive-agent", None),
    ("weather",         None),
    ("skill-vetter",    None),
    ("nano-pdf",        None),
    ("notion",          None),
    ("grill-me",          None),
    ("grill-with-docs",          None),
    ("improve-codebase-architecture",          None),
    ("frontend-design",          None),
]

GLOBAL_INSTALL = False     # -g 全局安装
SKIP_CONFIRM = True        # -y 跳过确认
USE_FALLBACK = True        # 搜索失败时回退到配置标识
SEARCH_TIMEOUT = 60
INSTALL_TIMEOUT = 60
LIST_TIMEOUT = 60

# 每个关键词最多尝试多少个候选
MAX_CANDIDATES = 5

# ============ 工具函数 ============


def strip_ansi(s: str) -> str:
    return ANSI_ESCAPE.sub("", s).replace("\r", "")


def check_npx() -> bool:
    return shutil.which("npx") is not None


def run_command(cmd, timeout: int) -> Tuple[bool, str, str]:
    """执行命令。Windows 下走 shell，兼容 npx.cmd。"""
    try:
        printable = " ".join(cmd) if isinstance(cmd, list) else cmd
        print(f"      🏃 执行: {printable}")
        r = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout,
            encoding="utf-8",
            errors="replace",
            shell=(os.name == "nt"),
        )
        return r.returncode == 0, r.stdout, r.stderr
    except subprocess.TimeoutExpired:
        printable = " ".join(cmd) if isinstance(cmd, list) else cmd
        return False, "", f"超时（{timeout}s）: {printable}"
    except Exception as e:
        return False, "", f"异常: {e}"


# ============ 已安装列表 ============


def get_installed_skills() -> Set[str]:
    """返回已安装技能的「名字」集合（小写）。"""
    ok, stdout, stderr = run_command("npx -y skills list", LIST_TIMEOUT)
    if not ok:
        print(f"  ⚠️  无法获取已安装列表: {stderr.strip()[:200]}")
        return set()

    text = strip_ansi(stdout)
    installed = set()
    for m in PATTERN_LIST_LINE.finditer(text):
        installed.add(m.group(1).lower())

    # 兜底解析
    if not installed:
        for line in text.splitlines():
            line = line.strip()
            if not line or line.startswith("Project"):
                continue
            if "Agents:" in line:
                parts = line.split()
                if parts:
                    installed.add(parts[0].lower())
    return installed


# ============ 搜索与候选排序 ============


def parse_skill_ids(output: str) -> List[str]:
    """从 npx skills find 输出中解析 'owner/repo@skill' 列表（保序去重）。"""
    output = strip_ansi(output)
    ids = []
    for m in PATTERN_ID.finditer(output):
        ids.append(f"{m.group(1)}@{m.group(2)}")
    seen, unique = set(), []
    for i in ids:
        if i not in seen:
            seen.add(i)
            unique.append(i)
    return unique


def rank_candidates(skill_ids: List[str], keyword: str) -> List[str]:
    """
    按匹配度排序候选：
    1) 技能名与关键词完全相等
    2) 技能名以关键词开头
    3) 其余（保持 CLI 原始顺序，即下载量降序）
    """
    kw = keyword.lower()
    exact, prefix, others = [], [], []
    for sid in skill_ids:
        name = sid.split("@")[-1].lower()
        if name == kw:
            exact.append(sid)
        elif name.startswith(kw):
            prefix.append(sid)
        else:
            others.append(sid)
    return exact + prefix + others


def search_candidates(keyword: str) -> List[str]:
    """搜索并返回排好序的候选列表。"""
    print(f"  🔍 搜索: {keyword}")
    ok, stdout, stderr = run_command(
        ["npx", "-y", "skills", "find", keyword], SEARCH_TIMEOUT
    )
    if not ok:
        print(f"      ❌ 搜索失败: {stderr.strip()[:200]}")
        return []

    ids = parse_skill_ids(stdout)
    if not ids:
        print("      ⚠️  未解析到技能标识")
        return []

    ranked = rank_candidates(ids, keyword)
    print(f"      ✅ 解析到 {len(ranked)} 个候选（已按匹配度排序）:")
    for sid in ranked[:MAX_CANDIDATES]:
        print(f"        - {sid}")
    return ranked


# ============ 安装 ============


def install_skill(skill_id: str) -> bool:
    print(f"  📦 安装: {skill_id}")
    cmd = ["npx", "-y", "skills", "add", skill_id]
    if GLOBAL_INSTALL:
        cmd.append("-g")
    if SKIP_CONFIRM:
        cmd.append("-y")

    ok, stdout, stderr = run_command(cmd, INSTALL_TIMEOUT)
    if ok:
        print("      ✅ 安装成功")
        return True
    # 打印失败原因（截断）
    err = (stderr or stdout or "").strip()
    print(f"      ❌ 安装失败: {err[:300]}")
    return False


def try_install_with_fallback(keyword: str,
                              candidates: List[str],
                              installed: Set[str]) -> Tuple[bool, Optional[str], str]:
    """
    依次尝试候选安装。
    返回 (是否成功, 成功标识或None, 状态说明)
    """
    tried = 0
    for cand in candidates:
        if tried >= MAX_CANDIDATES:
            break

        name = cand.split("@")[-1].lower()

        # 跳过已安装
        if name in installed:
            print(f"      ⏭️  候选已安装，跳过: {cand}")
            continue

        tried += 1
        if install_skill(cand):
            installed.add(name)
            return True, cand, "ok"
        else:
            print(f"      ↩️  切换下一个候选…")

    return False, None, "exhausted"


# ============ 主流程 ============


def main() -> int:
    print("=" * 60)
    print(" 批量安装 Skill（判重 → 搜索 → 候选依次尝试）")
    print("=" * 60)

    if not check_npx():
        print("❌ 未检测到 npx，请先安装 Node.js。")
        return 1

    installed = get_installed_skills()
    if installed:
        print(f"\n📋 检测到已安装 {len(installed)} 个技能：")
        for s in sorted(installed):
            print(f"   - {s}")
    else:
        print("\n📋 未检测到已安装技能（或无法读取列表）")

    success, skipped, failed = 0, [], []

    for idx, (keyword, fallback) in enumerate(SKILLS, start=1):
        print(f"\n[{idx}/{len(SKILLS)}] 关键词: {keyword}")
        print("-" * 60)

        # 0. 粗判：技能名已装
        if keyword.lower() in installed:
            print(f"      ⏭️  已安装，跳过: {keyword}")
            skipped.append(keyword)
            continue

        # 1. 搜索候选
        candidates = search_candidates(keyword)

        # 2. 搜索无结果时，回退到配置标识
        if not candidates:
            if USE_FALLBACK and fallback:
                print(f"      ↩️  搜索无结果，回退配置标识: {fallback}")
                candidates = [fallback]
            else:
                print("      ⏭️  跳过（无可用候选）")
                failed.append(keyword)
                continue

        # 3. 依次尝试候选安装
        ok, used, status = try_install_with_fallback(keyword, candidates, installed)

        if ok:
            success += 1
            print(f"      🎉 最终使用: {used}")
        else:
            print(f"      💀 所有候选均失败（尝试上限 {MAX_CANDIDATES}）")
            failed.append(keyword)

    print("\n" + "=" * 60)
    print(f" 完成！成功 {success}，跳过 {len(skipped)}，失败 {len(failed)}")
    if skipped:
        print(" 已跳过（已安装）：")
        for s in skipped:
            print(f"   - {s}")
    if failed:
        print(" 失败：")
        for f in failed:
            print(f"   - {f}")
    print("=" * 60)
    return 0 if not failed else 2


if __name__ == "__main__":
    sys.exit(main())