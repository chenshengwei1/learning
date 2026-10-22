# agent.py
import sys
import io
import os

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
    os.environ["PYTHONIOENCODING"] = "utf-8"
    sys.stdin = io.TextIOWrapper(sys.stdin.buffer, encoding='utf-8', errors='replace')

from dotenv import load_dotenv
from rich.console import Console
from rich.markdown import Markdown
from rich.panel import Panel
from rich.table import Table
from rich import box
from langchain_core.messages import HumanMessage, AIMessage
import uuid

from agent_core import create_agent
from logger import setup_logger, log_user_message

load_dotenv()
logger = setup_logger()
console = Console(force_terminal=True)


def check_environment():
    """检查运行环境"""
    api_key = os.getenv("DEEPSEEK_API_KEY")
    issues = []
    
    if not api_key:
        issues.append({
            "type": "error",
            "title": "未找到 DeepSeek API Key",
            "detail": "在 .env 文件中设置 DEEPSEEK_API_KEY=你的Key",
            "help": "前往 platform.deepseek.com 注册并获取 API Key"
        })
    elif api_key == "你的DeepSeek_API_Key":
        issues.append({
            "type": "error",
            "title": "API Key 还是默认占位符",
            "detail": "请在 .env 文件中替换为真实 Key",
            "help": "打开 .env 文件修改"
        })
    elif len(api_key) < 20:
        issues.append({
            "type": "warning",
            "title": "API Key 格式可能不对",
            "detail": f"当前 Key 长度只有 {len(api_key)} 个字符",
            "help": "请检查是否完整复制"
        })
    
    return issues, []


def print_startup_banner():
    console.print()
    console.print(Panel.fit(
        "[bold cyan]🚀 Leaning 项目智能助手 (CLI 模式)[/bold cyan]\n\n"
        "[dim]输入 /help 查看命令 | /web 启动 Web 界面 | exit 退出[/dim]",
        border_style="cyan"
    ))


def print_environment_status(issues, warnings):
    errors = [i for i in issues if i["type"] == "error"]
    warns = [i for i in issues if i["type"] == "warning"] + warnings
    
    if errors:
        console.print("\n[bold red]❌ 发现以下问题：[/bold red]\n")
        for i, error in enumerate(errors, 1):
            console.print(Panel(
                f"[bold red]问题 {i}：{error['title']}[/bold red]\n\n"
                f"[yellow]原因：[/yellow]{error['detail']}\n\n"
                f"[green]解决方法：[/green]{error['help']}",
                border_style="red",
                title="❌ 启动失败"
            ))
        console.print("\n[bold yellow]📖 快速配置指南：[/bold yellow]")
        console.print("  1. 访问 platform.deepseek.com 注册")
        console.print("  2. 创建 API Key")
        console.print("  3. 复制到 .env 文件中")
        return False
    
    if warns:
        console.print("[bold yellow]⚠️ 提醒：[/bold yellow]")
        for warn in warns:
            console.print(f"  • {warn['title']}")
    
    console.print("[green]✅ 环境检查通过[/green]\n")
    return True


def print_help():
    help_table = Table(title="[bold]📖 可用命令[/bold]", box=box.ROUNDED, border_style="cyan")
    help_table.add_column("命令", style="cyan", width=15)
    help_table.add_column("说明", style="white")
    help_table.add_row("exit", "退出智能体")
    help_table.add_row("/new", "开启新会话")
    help_table.add_row("/pages", "查看所有学习页面")
    help_table.add_row("/help", "显示此帮助")
    help_table.add_row("/web", "启动 Web 界面（新窗口）")
    help_table.add_row("resume", "恢复被中断的操作")
    help_table.add_row("cancel", "取消被中断的操作")
    help_table.add_row("[任意问题]", "直接描述需求")
    console.print(help_table)


def main():
    print_startup_banner()
    
    issues, warnings = check_environment()
    if not print_environment_status(issues, warnings):
        return
    
    console.print("[bold]我能帮你做什么：[/bold]")
    console.print("  • 创建新的学习页面")
    console.print("  • 修改和优化页面内容")
    console.print("  • 管理 Express 路由")
    console.print("  • 分析代码和查找问题")
    console.print()
    
    try:
        agent = create_agent()
    except Exception as e:
        console.print(f"[red]❌ 创建智能体失败: {e}[/red]")
        return
    
    config = {"configurable": {"thread_id": "leaning-cli"}}
    
    while True:
        try:
            user_input = console.input("[bold yellow]你:[/bold yellow] ").strip()
        except (EOFError, KeyboardInterrupt):
            console.print("\n[cyan]👋 再见！[/cyan]")
            break
        
        if not user_input:
            continue
        
        if user_input.lower() == "exit":
            console.print("[cyan]👋 再见！[/cyan]")
            break
        
        if user_input == "/help":
            print_help()
            continue
        
        if user_input == "/pages":
            from tools import list_pages
            try:
                console.print(f"[dim]{list_pages.invoke({})}[/dim]\n")
            except ValueError as e:
                console.print(f"[yellow]{e}[/yellow]\n")
            continue
        
        if user_input == "/web":
            console.print("[cyan]🚀 正在启动 Web 服务...[/cyan]")
            console.print("[dim]请在新终端运行: python web_server.py[/dim]")
            console.print("[dim]然后访问: http://localhost:8800[/dim]\n")
            continue
        
        if user_input == "/new":
            new_id = f"leaning-{uuid.uuid4().hex[:8]}"
            config = {"configurable": {"thread_id": new_id}}
            console.print(f"[green]✅ 新会话: {new_id}[/green]\n")
            continue
        
        if user_input.lower() == "resume":
            from agent_core import clear_interrupt
            clear_interrupt(config["configurable"]["thread_id"])
            console.print("[green]▶ 继续执行[/green]")
            continue
        
        if user_input.lower() == "cancel":
            from agent_core import set_interrupt
            set_interrupt(config["configurable"]["thread_id"], "cancel")
            console.print("[red]✕ 操作已取消[/red]")
            continue
        
        log_user_message(logger, user_input)
        
        console.print("[dim]🤔 思考中...[/dim]")
        
        try:
            result = agent.invoke(
                {"messages": [HumanMessage(content=user_input)]},
                config=config
            )
            
            last_message = result["messages"][-1]
            if isinstance(last_message, AIMessage) and last_message.content:
                console.print("\n[bold cyan]助手:[/bold cyan]")
                console.print(Markdown(last_message.content))
                console.print()
            
        except KeyboardInterrupt:
            console.print("\n[yellow]⏸ 操作已中断[/yellow]")
            console.print("[dim]输入 resume 恢复 | 输入 cancel 取消[/dim]")
            continue
        except Exception as e:
            error_msg = str(e)
            if "auth" in error_msg.lower() or "401" in error_msg:
                console.print("[red]❌ API Key 认证失败，请检查 .env 配置[/red]\n")
            elif "connection" in error_msg.lower():
                console.print("[red]❌ 网络连接失败，请检查网络[/red]\n")
            else:
                console.print(f"[red]❌ 出错: {error_msg}[/red]\n")


if __name__ == "__main__":
    main()