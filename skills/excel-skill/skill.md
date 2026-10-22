# Skill: Excel Read/Write

## 描述
该技能允许 Agent 读取和写入 Excel 文件（.xlsx / .xls），支持多 sheet、指定范围、表头识别、格式化写入等能力。

## 能力
- 读取 Excel：按 sheet 名或索引读取，可指定单元格范围、是否含表头
- 写入 Excel：新建或追加数据，支持多 sheet、自定义表头、格式设置
- 查询结构：列出所有 sheet 名称、行列数、表头
- 导出 JSON/CSV：将 Excel 数据转为 JSON 或 CSV

## 依赖
```bash
pip install -r scripts/requirements.txt