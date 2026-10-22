#!/usr/bin/env python3
"""Universal Excel skill CLI. All output is JSON on stdout."""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

try:
    import pandas as pd
    from openpyxl import load_workbook
    from openpyxl.styles import Alignment, Font, PatternFill
except ImportError as e:
    print(json.dumps({
        "error": f"missing dependency: {e.name}",
        "hint": "pip install -r scripts/requirements.txt",
    }, ensure_ascii=False))
    sys.exit(1)


# ---------- helpers ----------

def fail(msg: str, hint: str | None = None, code: int = 1):
    out = {"error": msg}
    if hint:
        out["hint"] = hint
    print(json.dumps(out, ensure_ascii=False))
    sys.exit(code)


def ensure_file(path: str) -> Path:
    p = Path(path)
    if not p.exists():
        fail(f"file not found: {path}", hint="check the path or upload the file first")
    return p


def resolve_sheet(path: Path, sheet):
    """Return sheet name. Accepts name or index."""
    names = pd.ExcelFile(path).sheet_names
    if sheet is None:
        return names[0]
    if isinstance(sheet, str) and sheet.isdigit():
        sheet = int(sheet)
    if isinstance(sheet, int):
        if 0 <= sheet < len(names):
            return names[sheet]
        fail(f"sheet index {sheet} out of range",
             hint=f"available sheets: {names}")
    if sheet not in names:
        fail(f"sheet '{sheet}' not found",
             hint=f"available sheets: {names}")
    return sheet


def parse_data(data_arg: str) -> pd.DataFrame:
    p = Path(data_arg)
    if p.exists():
        raw = json.loads(p.read_text(encoding="utf-8"))
    else:
        raw = json.loads(data_arg)
    if isinstance(raw, list):
        return pd.DataFrame(raw)
    if isinstance(raw, dict):
        return pd.DataFrame(raw)
    fail("data must be JSON array or object")


def df_to_records(df: pd.DataFrame):
    return json.loads(df.to_json(orient="records", force_ascii=False))


def style_sheet(path: Path, sheet: str):
    wb = load_workbook(path)
    if sheet not in wb.sheetnames:
        return
    ws = wb[sheet]
    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill("solid", fgColor="4472C4")
    for cell in ws[1]:
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center")
    for col in ws.columns:
        max_len = max((len(str(c.value)) for c in col if c.value is not None), default=8)
        ws.column_dimensions[col[0].column_letter].width = min(max_len + 4, 50)
    wb.save(path)


# ---------- commands ----------

def cmd_info(args):
    path = ensure_file(args.file)
    xls = pd.ExcelFile(path)
    sheets = []
    for name in xls.sheet_names:
        full = pd.read_excel(path, sheet_name=name)
        sheets.append({
            "name": name,
            "rows": int(full.shape[0]),
            "cols": int(full.shape[1]),
            "columns": [str(c) for c in full.columns],
        })
    print(json.dumps({"file": str(path), "sheets": sheets}, ensure_ascii=False))


def cmd_read(args):
    path = ensure_file(args.file)
    sheet = resolve_sheet(path, args.sheet)
    header = args.header.lower() == "true"

    kwargs = {"sheet_name": sheet, "header": 0 if header else None}
    if args.cell_range:
        m = re.match(r"([A-Z]+)(\d+):([A-Z]+)(\d+)", args.cell_range.upper())
        if not m:
            fail(f"invalid range: {args.cell_range}", hint="format like A1:D10")
        _, r1, _, r2 = m.groups()
        kwargs["skiprows"] = int(r1) - 1
        kwargs["nrows"] = int(r2) - int(r1) + 1

    try:
        df = pd.read_excel(path, **kwargs)
    except Exception as e:
        fail(f"read failed: {e}")

    if args.output == "json":
        result = df_to_records(df)
        payload = json.dumps(result, ensure_ascii=False, indent=2 if args.out_file else None)
    elif args.output == "csv":
        payload = df.to_csv(index=False)
    else:
        payload = df.to_string(index=False)

    if args.out_file:
        Path(args.out_file).write_text(payload, encoding="utf-8")
        print(json.dumps({
            "saved": args.out_file,
            "rows": int(df.shape[0]),
            "cols": int(df.shape[1]),
        }, ensure_ascii=False))
    else:
        print(payload)


def _write_df(path: Path, sheet: str, df: pd.DataFrame, header: bool, append: bool):
    if append and path.exists():
        try:
            old = pd.read_excel(path, sheet_name=sheet)
            df = pd.concat([old, df], ignore_index=True)
        except ValueError:
            append = False  # sheet doesn't exist
    mode = "a" if append and path.exists() else "w"
    kwargs = {"engine": "openpyxl", "mode": mode}
    if mode == "a":
        kwargs["if_sheet_exists"] = "replace"
    with pd.ExcelWriter(path, **kwargs) as writer:
        df.to_excel(writer, sheet_name=sheet, index=False, header=header)


def cmd_write(args):
    df = parse_data(args.data)
    header = args.header.lower() == "true"
    path = Path(args.file)
    try:
        _write_df(path, args.sheet, df, header, append=False)
    except Exception as e:
        fail(f"write failed: {e}")
    if not args.no_style and header:
        try:
            style_sheet(path, args.sheet)
        except Exception:
            pass
    print(json.dumps({
        "saved": str(path), "sheet": args.sheet,
        "rows": int(df.shape[0]), "mode": "write",
    }, ensure_ascii=False))


def cmd_append(args):
    df = parse_data(args.data)
    header = args.header.lower() == "true"
    path = Path(args.file)
    existed = path.exists()
    try:
        _write_df(path, args.sheet, df, header, append=True)
    except Exception as e:
        fail(f"append failed: {e}")
    print(json.dumps({
        "saved": str(path), "sheet": args.sheet,
        "rows_appended": int(df.shape[0]),
        "mode": "append" if existed else "write",
    }, ensure_ascii=False))


def cmd_update(args):
    path = ensure_file(args.file)
    sheet = resolve_sheet(path, args.sheet)
    try:
        cells = json.loads(args.cells)
    except Exception as e:
        fail(f"cells must be JSON object like {{\"B2\":42}}: {e}")

    wb = load_workbook(path)
    ws = wb[sheet]
    for addr, value in cells.items():
        ws[addr] = value
    wb.save(path)
    print(json.dumps({
        "saved": str(path), "sheet": sheet,
        "updated_cells": list(cells.keys()),
    }, ensure_ascii=False))


def cmd_convert(args):
    path = ensure_file(args.file)
    src_ext = path.suffix.lower()
    to = args.to.lower()

    if src_ext in (".xlsx", ".xls") and to == "csv":
        df = pd.read_excel(path, sheet_name=args.sheet or 0)
        out = Path(args.out) if args.out else path.with_suffix(".csv")
        df.to_csv(out, index=False)
    elif src_ext in (".xlsx", ".xls") and to == "json":
        df = pd.read_excel(path, sheet_name=args.sheet or 0)
        out = Path(args.out) if args.out else path.with_suffix(".json")
        out.write_text(json.dumps(df_to_records(df), ensure_ascii=False, indent=2),
                       encoding="utf-8")
    elif src_ext == ".csv" and to in ("xlsx", "xls"):
        df = pd.read_csv(path)
        out = Path(args.out) if args.out else path.with_suffix(".xlsx")
        df.to_excel(out, index=False, engine="openpyxl")
    elif src_ext == ".json" and to in ("xlsx", "xls"):
        df = pd.DataFrame(json.loads(path.read_text(encoding="utf-8")))
        out = Path(args.out) if args.out else path.with_suffix(".xlsx")
        df.to_excel(out, index=False, engine="openpyxl")
    else:
        fail(f"unsupported conversion: {src_ext} -> {to}",
             hint="supported: xlsx/xls -> csv/json, csv/json -> xlsx")

    print(json.dumps({"saved": str(out), "from": str(path), "to": to},
                     ensure_ascii=False))


# ---------- CLI ----------

def main():
    p = argparse.ArgumentParser(prog="excel", description="Universal Excel skill")
    sub = p.add_subparsers(dest="cmd", required=True)

    # info
    s = sub.add_parser("info", help="inspect sheets/columns/rows")
    s.add_argument("--file", required=True)
    s.set_defaults(func=cmd_info)

    # read
    s = sub.add_parser("read", help="read a sheet")
    s.add_argument("--file", required=True)
    s.add_argument("--sheet", default=None)
    s.add_argument("--header", default="true")
    s.add_argument("--range", dest="cell_range", default=None)
    s.add_argument("--output", choices=["json", "csv", "table"], default="json")
    s.add_argument("--out-file", default=None)
    s.set_defaults(func=cmd_read)

    # write
    s = sub.add_parser("write", help="overwrite/create a sheet")
    s.add_argument("--file", required=True)
    s.add_argument("--sheet", default="Sheet1")
    s.add_argument("--data", required=True)
    s.add_argument("--header", default="true")
    s.add_argument("--no-style", action="store_true")
    s.set_defaults(func=cmd_write)

    # append
    s = sub.add_parser("append", help="append rows")
    s.add_argument("--file", required=True)
    s.add_argument("--sheet", default="Sheet1")
    s.add_argument("--data", required=True)
    s.add_argument("--header", default="true")
    s.set_defaults(func=cmd_append)

    # update
    s = sub.add_parser("update", help="update specific cells")
    s.add_argument("--file", required=True)
    s.add_argument("--sheet", default=None)
    s.add_argument("--cells", required=True, help='JSON, e.g. {"B2":42}')
    s.set_defaults(func=cmd_update)

    # convert
    s = sub.add_parser("convert", help="convert between formats")
    s.add_argument("--file", required=True)
    s.add_argument("--to", required=True, choices=["csv", "json", "xlsx", "xls"])
    s.add_argument("--out", default=None)
    s.add_argument("--sheet", default=None)
    s.set_defaults(func=cmd_convert)

    args = p.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()