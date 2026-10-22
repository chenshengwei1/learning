# server.py
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Excel 操作工具包
支持读取、写入、格式化、数据筛选等操作
依赖: pip install openpyxl pandas
"""
from mcp.server import MCPServer

mcp = MCPServer("MathServer")

@mcp.tool()
def add(a: int, b: int) -> int:
    """计算两个整数的和。"""
    return a + b

@mcp.tool()
def multiply(a: int, b: int) -> int:
    """计算两个整数的乘积。"""
    return a * b

import json
import os
from typing import List, Dict, Any, Optional
from datetime import datetime

try:
    import openpyxl
    from openpyxl.styles import Font, PatternFill, Alignment
    from openpyxl.utils import get_column_letter
except ImportError:
    raise ImportError("请安装依赖: pip install openpyxl pandas")

try:
    import pandas as pd
except ImportError:
    raise ImportError("请安装依赖: pip install pandas")


class ExcelTool:
    """Excel 操作工具类"""
    
    def __init__(self, file_path: str):
        self.file_path = file_path
        self.wb = None
        self.current_sheet = None
    
    def _load(self, sheet_name: Optional[str] = None):
        if not os.path.exists(self.file_path):
            raise FileNotFoundError(f"文件不存在: {self.file_path}")
        
        self.wb = openpyxl.load_workbook(self.file_path, data_only=False)
        if sheet_name:
            if sheet_name not in self.wb.sheetnames:
                raise ValueError(f"工作表 '{sheet_name}' 不存在")
            self.current_sheet = self.wb[sheet_name]
        else:
            self.current_sheet = self.wb.active
    
    def _save(self):
        if self.wb:
            self.wb.save(self.file_path)
    
    # ========== 读取操作 ==========
    
    def get_sheet_names(self) -> List[str]:
        """获取所有工作表名称"""
        self._load()
        names = self.wb.sheetnames
        self._save = lambda: None
        return names
    
    def read_all(self, sheet_name: Optional[str] = None, 
                 start_row: int = 1, end_row: Optional[int] = None,
                 start_col: int = 1, end_col: Optional[int] = None) -> List[List[Any]]:
        """读取整个工作表或指定范围"""
        self._load(sheet_name)
        ws = self.current_sheet
        
        max_row = end_row or ws.max_row
        max_col = end_col or ws.max_column
        
        result = []
        for row in range(start_row, min(max_row + 1, ws.max_row + 1)):
            row_data = []
            for col in range(start_col, min(max_col + 1, ws.max_column + 1)):
                cell = ws.cell(row=row, column=col)
                row_data.append(cell.value)
            result.append(row_data)
        
        return result
    
    def read_to_dict(self, sheet_name: Optional[str] = None, 
                     header_row: int = 1) -> List[Dict[str, Any]]:
        """读取为字典列表（第一行为表头）"""
        self._load(sheet_name)
        ws = self.current_sheet
        
        headers = [ws.cell(row=header_row, column=c).value for c in range(1, ws.max_column + 1)]
        
        result = []
        for row in range(header_row + 1, ws.max_row + 1):
            row_dict = {}
            for col_idx, header in enumerate(headers, start=1):
                value = ws.cell(row=row, column=col_idx).value
                row_dict[str(header)] = value
            result.append(row_dict)
        
        return result
    
    def read_cell(self, sheet_name: Optional[str] = None, 
                  row: int = 1, col: int = 1) -> Any:
        """读取单个单元格"""
        self._load(sheet_name)
        return self.current_sheet.cell(row=row, column=col).value
    
    def get_statistics(self, sheet_name: Optional[str] = None, 
                       column_index: int = 1) -> Dict[str, float]:
        """获取数值列的统计信息"""
        self._load(sheet_name)
        ws = self.current_sheet
        
        values = []
        for row in range(2, ws.max_row + 1):
            val = ws.cell(row=row, column=column_index).value
            if isinstance(val, (int, float)):
                values.append(val)
        
        if not values:
            return {'min': None, 'max': None, 'avg': 0, 'sum': 0, 'count': 0}
        
        return {
            'min': min(values),
            'max': max(values),
            'avg': sum(values) / len(values),
            'sum': sum(values),
            'count': len(values)
        }
    
    def count_unique(self, sheet_name: Optional[str] = None, 
                     column_index: int = 1) -> Dict[str, int]:
        """统计唯一值及其出现次数"""
        self._load(sheet_name)
        ws = self.current_sheet
        
        counts = {}
        for row in range(2, ws.max_row + 1):
            val = ws.cell(row=row, column=column_index).value
            if val is not None:
                key = str(val)
                counts[key] = counts.get(key, 0) + 1
        
        return counts
    
    # ========== 写入操作 ==========
    
    def create_new(self, file_path: str, 
                   sheets: Dict[str, List[List[Any]]],
                   headers: Optional[Dict[str, List[str]]] = None) -> str:
        """创建新 Excel 文件"""
        wb = openpyxl.Workbook()
        
        if 'Sheet' in wb.sheetnames:
            del wb['Sheet']
        
        for sheet_name, data in sheets.items():
            ws = wb.create_sheet(title=sheet_name)
            
            for row_idx, row_data in enumerate(data, start=1):
                for col_idx, value in enumerate(row_data, start=1):
                    ws.cell(row=row_idx, column=col_idx, value=value)
            
            if headers and sheet_name in headers:
                for col_idx, header in enumerate(headers[sheet_name], start=1):
                    ws.cell(row=1, column=col_idx, value=header)
        
        output_dir = os.path.dirname(file_path)
        if output_dir and not os.path.exists(output_dir):
            os.makedirs(output_dir)
        
        wb.save(file_path)
        return file_path
    
    def write_to_sheet(self, data: List[List[Any]], 
                       sheet_name: Optional[str] = None,
                       start_row: int = 1, start_col: int = 1) -> None:
        """写入数据到指定工作表"""
        self._load(sheet_name)
        ws = self.current_sheet
        
        for row_idx, row_data in enumerate(data, start=start_row):
            for col_idx, value in enumerate(row_data, start=start_col):
                ws.cell(row=row_idx, column=col_idx, value=value)
        
        self._save()
    
    def update_cell(self, value: Any, sheet_name: Optional[str] = None,
                    row: int = 1, col: int = 1) -> None:
        """更新单个单元格"""
        self._load(sheet_name)
        self.current_sheet.cell(row=row, column=col, value=value)
        self._save()
    
    def append_row(self, row_data: List[Any], 
                   sheet_name: Optional[str] = None) -> None:
        """在末尾追加一行"""
        self._load(sheet_name)
        ws = self.current_sheet
        ws.append(row_data)
        self._save()
    
    # ========== 格式化操作 ==========
    
    def set_column_width(self, width: float, 
                         sheet_name: Optional[str] = None,
                         start_col: int = 1, end_col: Optional[int] = None) -> None:
        """设置列宽"""
        self._load(sheet_name)
        ws = self.current_sheet
        end = end_col or ws.max_column
        
        for col in range(start_col, end + 1):
            ws.column_dimensions[get_column_letter(col)].width = width
        self._save()
    
    def set_cell_format(self, row: int, col: int,
                        bold: bool = False, italic: bool = False,
                        font_size: int = 11,
                        bg_color: Optional[str] = None,
                        text_color: Optional[str] = None) -> None:
        """设置单元格格式"""
        self._load()
        ws = self.current_sheet
        cell = ws.cell(row=row, column=col)
        
        cell.font = Font(bold=bold, italic=italic, size=font_size, color=text_color)
        
        if bg_color:
            cell.fill = PatternFill(start_color=bg_color, end_color=bg_color, fill_type='solid')
        
        self._save()
    
    def freeze_panes(self, row: int = 2, col: int = 1,
                     sheet_name: Optional[str] = None) -> None:
        """冻结窗格（默认冻结表头）"""
        self._load(sheet_name)
        self.current_sheet.freeze_panes = f"{get_column_letter(col)}{row}"
        self._save()
    
    def center_align(self, start_row: int = 1, end_row: Optional[int] = None,
                     start_col: int = 1, end_col: Optional[int] = None,
                     sheet_name: Optional[str] = None) -> None:
        """居中对齐"""
        self._load(sheet_name)
        ws = self.current_sheet
        end_r = end_row or ws.max_row
        end_c = end_col or ws.max_column
        
        for row in range(start_row, end_r + 1):
            for col in range(start_col, end_c + 1):
                ws.cell(row=row, column=col).alignment = Alignment(horizontal='center')
        self._save()
    
    # ========== 数据筛选 ==========
    
    def filter_by_condition(self, column_index: int, operator: str, 
                            value: Any, sheet_name: Optional[str] = None) -> List[Dict[str, Any]]:
        """按条件筛选数据"""
        self._load(sheet_name)
        ws = self.current_sheet
        
        headers = [ws.cell(row=1, column=c).value for c in range(1, ws.max_column + 1)]
        
        results = []
        for row in range(2, ws.max_row + 1):
            cell_val = ws.cell(row=row, column=column_index).value
            
            matched = False
            if operator == '=' and cell_val == value:
                matched = True
            elif operator == '!=' and cell_val != value:
                matched = True
            elif operator == '>' and cell_val is not None and cell_val > value:
                matched = True
            elif operator == '<' and cell_val is not None and cell_val < value:
                matched = True
            elif operator == '>=' and cell_val is not None and cell_val >= value:
                matched = True
            elif operator == '<=' and cell_val is not None and cell_val <= value:
                matched = True
            elif operator == 'contains' and cell_val is not None and str(value) in str(cell_val):
                matched = True
            
            if matched:
                row_dict = {}
                for col_idx, header in enumerate(headers, start=1):
                    row_dict[str(header)] = ws.cell(row=row, column=col_idx).value
                results.append(row_dict)
        
        return results
    
    def sort_by_column(self, column_index: int, ascending: bool = True,
                       sheet_name: Optional[str] = None) -> List[List[Any]]:
        """按列排序并返回排序后的数据"""
        self._load(sheet_name)
        ws = self.current_sheet
        
        data = []
        for row in range(1, ws.max_row + 1):
            row_data = [ws.cell(row=row, column=c).value for c in range(1, ws.max_column + 1)]
            data.append(row_data)
        
        header = data[0]
        rows = data[1:]
        rows.sort(key=lambda x: x[column_index - 1] if x[column_index - 1] is not None else '', 
                  reverse=not ascending)
        
        sorted_data = [header] + rows
        
        for row_idx, row_data in enumerate(sorted_data, start=1):
            for col_idx, value in enumerate(row_data, start=1):
                ws.cell(row=row_idx, column=col_idx, value=value)
        
        self._save()
        return sorted_data
    
    # ========== 导出功能 ==========
    
    def export_to_csv(self, output_path: str, sheet_name: Optional[str] = None) -> str:
        """导出为 CSV 文件"""
        self._load(sheet_name)
        df = pd.DataFrame(self.read_all(sheet_name))
        df.to_csv(output_path, index=False, encoding='utf-8-sig')
        return output_path


# ========== 便捷函数 ==========

@mcp.tool()
def read_excel(file_path: str, sheet_name: Optional[str] = None) -> List[List[Any]]:
    """快速读取 Excel"""
    tool = ExcelTool(file_path)
    return tool.read_all(sheet_name)
    
@mcp.tool()
def create_excel(file_path: str, sheets: Dict[str, List[List[Any]]]) -> str:
    """快速创建 Excel"""
    tool = ExcelTool('')
    return tool.create_new(file_path, sheets)

@mcp.tool()
def analyze_excel(file_path: str, sheet_name: Optional[str] = None) -> Dict[str, Any]:
    """分析 Excel 文件结构"""
    tool = ExcelTool(file_path)
    
    info = {
        'file_path': file_path,
        'sheets': tool.get_sheet_names(),
        'sheet_info': {}
    }
    
    for sheet in info['sheets']:
        tool._load(sheet)
        ws = tool.current_sheet
        info['sheet_info'][sheet] = {
            'rows': ws.max_row,
            'cols': ws.max_column,
            'dimensions': f"{ws.dimensions}"
        }
    
    return info

if __name__ == "__main__":
    # 监听 3000 端口以匹配客户端配置
    mcp.run(transport="streamable-http", port=3000)