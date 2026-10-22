# main.py
from flask import app

from typing import Optional
from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse, JSONResponse
from pathlib import Path
import pickle

import agent_log

# 创建路由器
router = APIRouter(prefix="/log", tags=["log"])

# 允许的级别下拉项
LEVEL_OPTIONS = ["OFF", "DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]


@router.get("/modules")
def api_list_modules():
    """返回所有出现过的模块 + 当前级别"""
    return {
        "levels": LEVEL_OPTIONS,
        "modules": agent_log.list_module_levels(),
    }


@router.post("/modules/{module_name}")
async def api_set_module(module_name: str, request: Request):
    """设置某个模块的级别。body: {"level": "DEBUG"}"""
    body = await request.json()
    level = str(body.get("level", "OFF")).upper()

    if level == "OFF":
        agent_log.remove_module_level(module_name)
    else:
        agent_log.set_module_level(module_name, level)

    return {"ok": True, "module": module_name, "level": level}


@router.get("/", response_class=HTMLResponse)
def index():
    return PAGE_HTML


PAGE_HTML = """
<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="utf-8">
  <title>日志级别管理</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 24px; }
    table { border-collapse: collapse; width: 100%; max-width: 800px; }
    th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
    th { background: #f5f5f5; }
    select { padding: 4px 8px; }
    .tag { color: #888; font-size: 12px; }
  </style>
</head>
<body>
  <h2>模块日志级别管理</h2>
  <p class="tag">选择 DEBUG 及以上级别 = 该模块日志会写入 debug_xxx.log；选 OFF = 不输出。</p>
  <button onclick="load()">刷新</button>
  <table>
    <thead>
      <tr><th>模块</th><th>当前级别</th></tr>
    </thead>
    <tbody id="tbody"></tbody>
  </table>

<script>
let LEVELS = [];

async function load() {
  const res = await fetch('/log/modules');
  const data = await res.json();
  LEVELS = data.levels;
  const tbody = document.getElementById('tbody');
  tbody.innerHTML = '';
  const entries = Object.entries(data.modules);
  if (entries.length === 0) {
    tbody.innerHTML = '<tr><td colspan="2">暂无模块（先产生一些日志）</td></tr>';
    return;
  }
  for (const [mod, level] of entries) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${mod}</td><td></td>`;
    const td = tr.querySelector('td:last-child');
    const sel = document.createElement('select');
    for (const lv of LEVELS) {
      const opt = document.createElement('option');
      opt.value = lv; opt.textContent = lv;
      if (lv === level) opt.selected = true;
      sel.appendChild(opt);
    }
    sel.onchange = async () => {
      await fetch(`/log/modules/${encodeURIComponent(mod)}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({level: sel.value})
      });
    };
    td.appendChild(sel);
    tbody.appendChild(tr);
  }
}

load();
</script>
</body>
</html>
"""