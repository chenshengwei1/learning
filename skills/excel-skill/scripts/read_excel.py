#!/usr/bin/env python3
"""读取 Excel 文件并输出为 JSON / CSV / 表格。"""
import argparse
import json
import sys
from pathlib import Path

import pandas as pd


def load_sheet(file: str, sheet, header: bool, cell_range: str | None):
    kwargs = {"header": 0 if header else None}
    if cell_range:
        kwargs["usecols"] = None  # 由 openpyxl 处理范围，这里用 skiprows/nrows 替代
    # 处理范围 A1:D10
    if cell_range:
        import re
        m = re.match(r"([A-Z]+)(\d+):([A-Z]+)(\d+)", cell_range.upper())
        if m:
            _, r1, _, r2 = m.groups()
            kwargs["skiprows"] = int(r1) - 1
            kwargs["nrows"] = int(r2) - int(r1) + 1
    return pd.read_excel(file, sheet_name=sheet, **kwargs)


def df_to_table(df: pd.DataFrame) -> str:
    return df.to_string(index=False)


def main():
    p = argparse.ArgumentParser(description="Read Excel")
    p.add_argument("--file", required=True)
    p.add_argument("--sheet", default=0)
    p.add_argument("--header", default="true")
    p.add_argument("--range", dest="cell_range", default=None)
    p.add_argument("--output", choices=["json", "csv", "table"], default="json")
    p.add_argument("--out-file", default=None)
    p.add_argument("--info", action="store_true", help="仅输出结构信息")
    args = p.parse_args()

    path = Path(args.file)
    if not path.exists():
        print(json.dumps({"error": f"file not found: {args.file}"}, ensure_ascii=False))
        sys.exit(1)

    header = args.header.lower() == "true"
    sheet = args.sheet
    if isinstance(sheet, str) and sheet.isdigit():
        sheet = int(sheet)

    try:
        if args.info:
            xls = pd.ExcelFile(path)
            info = []
            for s in xls.sheet_names:
                df = pd.read_excel(path, sheet_name=s, nrows=0)
                full = pd.read_excel(path, sheet_name=s)
                info.append({
                    "sheet": s,
                    "columns": list(df.columns),
                    "rows": int(full.shape[0]),
                    "cols": int(full.shape[1]),
                })
            print(json.dumps(info, ensure_ascii=False, indent=2))
            return

        df = load_sheet(str(path), sheet, header, args.cell_range)
    except ValueError as e:
        try:
            xls = pd.ExcelFile(path)
            print(json.dumps({
                "error": str(e),
                "available_sheets": xls.sheet_names,
            }, ensure_ascii=False))
        except Exception:
            print(json.dumps({"error": str(e)}, ensure_ascii=False))
        sys.exit(1)

    if args.output == "json":
        result = df.to_json(orient="records", force_ascii=False)
    elif args.output == "csv":
        result = df.to_csv(index=False)
    else:
        result = df_to_table(df)

    if args.out_file:
        Path(args.out_file).write_text(result, encoding="utf-8")
        print(json.dumps({"saved": args.out_file, "rows": len(df)}, ensure_ascii=False))
    else:
        print(result)


if __name__ == "__main__":
    main()