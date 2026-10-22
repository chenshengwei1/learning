import os
from typing import List, Set


class DirDiffResult:
    def __init__(self):
        # 当前层子目录集合不一致的路径
        self.dir_mismatch_path: List[str] = []
        self.src_only_dirs: List[str] = []
        self.dst_only_dirs: List[str] = []


def scan_dir_structure_only(src: str, dst: str, res: DirDiffResult):
    """
    仅对比文件夹结构，完全忽略所有文件
    若本层子目录名称集合不一致，记录，停止向下递归；一致则继续递归子目录
    """
    if not os.path.isdir(src) or not os.path.isdir(dst):
        return

    # 只获取子目录名称，过滤掉全部文件
    src_subdirs: Set[str] = {e.name for e in os.scandir(src) if e.is_dir(follow_symlinks=False)}
    dst_subdirs: Set[str] = {e.name for e in os.scandir(dst) if e.is_dir(follow_symlinks=False)}

    src_only = src_subdirs - dst_subdirs
    dst_only = dst_subdirs - src_subdirs

    for name in sorted(src_only):
        res.src_only_dirs.append(os.path.join(src, name))
    for name in sorted(dst_only):
        res.dst_only_dirs.append(os.path.join(dst, name))

    if src_only or dst_only:
        res.dir_mismatch_path.append(src)
        # 子目录集合不一致，停止向下递归该分支
        return
    else:
        # 子目录集合完全相同，逐个递归子目录
        for sub_name in src_subdirs:
            src_sub = os.path.join(src, sub_name)
            dst_sub = os.path.join(dst, sub_name)
            scan_dir_structure_only(src_sub, dst_sub, res)


def compare_folder_structure(src_dir: str, dst_dir: str, report_path=None):
    output_lines = []

    def log(s: str):
        print(s)
        output_lines.append(s)

    if not os.path.isdir(src_dir):
        log(f"[错误]源目录不存在: {src_dir}")
        return
    if not os.path.isdir(dst_dir):
        log(f"[错误]目标目录不存在: {dst_dir}")
        return

    log("=" * 70)
    log(f"源目录: {src_dir}")
    log(f"目标目录: {dst_dir}")
    log("【仅对比文件夹结构，全部文件忽略不处理】")
    log("=" * 70)

    result = DirDiffResult()
    scan_dir_structure_only(src_dir, dst_dir, result)

    if result.dir_mismatch_path:
        log("\n[发现目录结构不一致的层级，这些分支已停止向下递归]")
        for p in result.dir_mismatch_path:
            log(f"  {p}")
    else:
        log("\n✅所有层级子目录名称集合完全一致")

    log(f"\n源侧独有的文件夹({len(result.src_only_dirs)}):")
    for d in result.src_only_dirs:
        log(f"  {d}")

    log(f"\n目标侧独有的文件夹({len(result.dst_only_dirs)}):")
    for d in result.dst_only_dirs:
        log(f"  {d}")

    if report_path is not None:
        with open(report_path, "w", encoding="utf-8") as fw:
            fw.write("\n".join(output_lines))
        log(f"\n📄结构差异报告已保存：{report_path}")


if __name__ == "__main__":
    SOURCE = r"D:\doc"
    TARGET = r"C:\doc"
    REPORT = r".\dir_structure_diff.txt"

    compare_folder_structure(SOURCE, TARGET, report_path=REPORT)
