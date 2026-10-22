import pandas as pd
import numpy as np
import json

#pip install pandas openpyxl
# 如果需要读旧版 .xls
# pip install xlrd

USER_DATA = "C:/doc/doc/个人/LSP_user.xlsx"

# 读取整个工作表
# df = pd.read_excel(USER_DATA, sheet_name="Sheet1")
# print(df)

# # 常用参数
# df = pd.read_excel(
#     "data.xlsx",
#     sheet_name=0,        # 工作表名或索引，0 表示第一个
#     header=0,            # 第几行作为列名
#     usecols="A:C",       # 只读 A~C 列，也可写 ["姓名","年龄"]
#     skiprows=1,          # 跳过前 1 行
#     nrows=100,           # 只读前 100 行
# )

import re, keyword
from types import SimpleNamespace

def to_legal_key(k, idx=0, mapping=None):
    k = str(k).strip()
    if mapping and k in mapping:
        return mapping[k]
    k = re.sub(r"\W", "_", k)
    if not k or k[0].isdigit():
        k = f"col_{k}" if k else f"col_{idx}"
    if keyword.iskeyword(k):
        k = f"{k}_"
    return k

def dict_to_obj(d: dict, mapping=None):
    used = set()
    clean = {}
    key_map = {}
    for i, (k, v) in enumerate(d.items()):
        nk = to_legal_key(k, i, mapping)
        base, j = nk, 1
        while nk in used:
            nk = f"{base}_{j}"
            j += 1
        used.add(nk)
        clean[nk] = v
        key_map[nk] = k
    obj = SimpleNamespace(**clean)
    obj._key_map = key_map
    return obj

def getUsers():
    # 读所有工作表，返回 dict：{表名: DataFrame}
    sheets = pd.read_excel(USER_DATA, sheet_name=None)
    for name, df in sheets.items():

        # 去掉全空行
        df = df.dropna(how="all")

        # 去掉空字符串造成的“假空行”
        df = df.replace(r"^\s*$", pd.NA, regex=True).dropna(how="all")

        # 去掉 pandas 自动生成的空列
        df = df.loc[:, ~df.columns.str.contains("^Unnamed")]

        # 转成列表
        # 转成 [{col: rowdata}]
        dataList = df.replace({np.nan: None}).to_dict(orient="records")
        #print('dataList as ')
        #print(json.dumps(dataList, ensure_ascii=False, indent=2))
        #print('end')
        #print(name, df.shape)

    objList = []
    for data in dataList:
        obj = dict_to_obj(data, mapping={"姓名": "name", "年龄": "age"})
        objList.append(obj)
    #print('Converted object:')
    return objList
getUsers()