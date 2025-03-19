import os
import json
import queue
import threading
import tkinter as tk
from tkinter import ttk, scrolledtext, messagebox, filedialog
from datetime import datetime
from pathlib import Path
from typing import Dict
import requests
from rich.markdown import Markdown

# 配置信息
DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"
## API_KEY = os.getenv("DEEPSEEK_API_KEY")
API_KEY = 'sk-ac972af6d763480aa2390a48e0697fae'
SAVE_DIR = Path("chat_history")
DEFAULT_SYSTEM_PROMPT = "你是一个乐于助人的智能助手"

class DeepSeekGUI(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("DeepSeek Chat Assistant")
        self.geometry("1000x700")
        self._setup_gui()
        self._init_chat_system()
        self._setup_bindings()
        
    def _init_chat_system(self):
        self.sessions: Dict[str, dict] = {}
        self.current_session = None
        self.response_queue = queue.Queue()
        self.streaming = False
        self._setup_dirs()
        self.create_session()
        
    def _setup_dirs(self):
        SAVE_DIR.mkdir(exist_ok=True)
        
    def _setup_gui(self):
        # 主界面布局
        main_frame = ttk.Frame(self)
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        # 会话列表面板
        self.session_panel = ttk.Frame(main_frame, width=200)
        self.session_panel.pack(side=tk.LEFT, fill=tk.Y, padx=5, pady=5)
        
        ttk.Label(self.session_panel, text="会话列表").pack()
        self.session_list = tk.Listbox(self.session_panel, width=25)
        self.session_list.pack(fill=tk.BOTH, expand=True, pady=5)
        
        btn_frame = ttk.Frame(self.session_panel)
        btn_frame.pack(fill=tk.X)
        ttk.Button(btn_frame, text="新建", command=self.create_session).pack(side=tk.LEFT, fill=tk.X, expand=True)
        ttk.Button(btn_frame, text="删除", command=self.delete_session).pack(side=tk.LEFT, fill=tk.X, expand=True)
        
        # 聊天主面板
        chat_frame = ttk.Frame(main_frame)
        chat_frame.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        # 聊天记录显示
        self.chat_history = scrolledtext.ScrolledText(
            chat_frame,
            wrap=tk.WORD,
            state='disabled',
            font=('微软雅黑', 11))
        self.chat_history.pack(fill=tk.BOTH, expand=True)
        
        # 输入区域
        input_frame = ttk.Frame(chat_frame)
        input_frame.pack(fill=tk.X, pady=5)
        
        self.input_text = tk.Text(input_frame, height=4, font=('微软雅黑', 11))
        self.input_text.pack(fill=tk.X, side=tk.LEFT, expand=True)
        self.input_text.bind("<Return>", self._on_enter_pressed)
        
        ttk.Button(input_frame, text="发送", command=self.send_message).pack(side=tk.RIGHT)
        
        # 状态栏
        self.status_bar = ttk.Label(self, text="就绪")
        self.status_bar.pack(fill=tk.X)
        
        # 菜单栏
        self._create_menu()
        
    def _create_menu(self):
        menu_bar = tk.Menu(self)
        
        # 文件菜单
        file_menu = tk.Menu(menu_bar, tearoff=0)
        file_menu.add_command(label="保存会话", command=self.save_session)
        file_menu.add_command(label="加载会话", command=self.load_session)
        file_menu.add_separator()
        file_menu.add_command(label="退出", command=self.destroy)
        menu_bar.add_cascade(label="文件", menu=file_menu)
        
        # 设置菜单
        settings_menu = tk.Menu(menu_bar, tearoff=0)
        settings_menu.add_command(label="系统提示设置", command=self.set_system_prompt)
        settings_menu.add_command(label="切换模型设置", command=self.show_settings)
        menu_bar.add_cascade(label="设置", menu=settings_menu)
        
        self.config(menu=menu_bar)
        
    def _setup_bindings(self):
        self.session_list.bind("<<ListboxSelect>>", self.switch_session)
        
    def _on_enter_pressed(self, event):
        if not event.state & 0x1:  # 检查是否按下Shift
            self.send_message()
            return "break"
        
    def _update_chat_display(self, message: str, is_user: bool = False):
        self.chat_history.configure(state='normal')
        tag = "user" if is_user else "assistant"
        self.chat_history.insert(tk.END, message + "\n\n", tag)
        self.chat_history.configure(state='disabled')
        self.chat_history.see(tk.END)
        
    def _stream_writer(self):
        while self.streaming:
            try:
                content = self.response_queue.get_nowait()
                self._append_stream_content(content)
            except queue.Empty:
                self.after(50, self._stream_writer)
                break
            
    def _append_stream_content(self, content: str):
        self.chat_history.configure(state='normal')
        self.chat_history.insert(tk.END, content, "stream")
        self.chat_history.configure(state='disabled')
        self.chat_history.see(tk.END)
        
    def _render_markdown(self, text: str):
        try:
            markdown = Markdown(text)
            return markdown
        except:
            return text
        
    def create_session(self, system_prompt: str = DEFAULT_SYSTEM_PROMPT):
        session_id = f"session_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        self.sessions[session_id] = {
            "history": [{"role": "system", "content": system_prompt}],
            "system_prompt": system_prompt,
            "created": datetime.now()
        }
        self.current_session = session_id
        self.session_list.insert(tk.END, session_id)
        self.session_list.selection_clear(0, tk.END)
        self.session_list.selection_set(tk.END)
        self._update_status(f"已创建新会话: {session_id}")
        
    def delete_session(self):
        selection = self.session_list.curselection()
        if not selection:
            return
        session_id = self.session_list.get(selection[0])
        del self.sessions[session_id]
        self.session_list.delete(selection[0])
        
    def switch_session(self, event):
        selection = self.session_list.curselection()
        if selection:
            self.current_session = self.session_list.get(selection[0])
            self._refresh_chat_history()
            self._update_status(f"已切换到会话: {self.current_session}")
            
    def _refresh_chat_history(self):
        self.chat_history.configure(state='normal')
        self.chat_history.delete(1.0, tk.END)
        for msg in self.sessions[self.current_session]["history"][1:]:  # 跳过系统提示
            self._update_chat_display(
                f"{msg['role']}:\n{msg['content']}",
                is_user=(msg['role'] == 'user')
            )
            
    def send_message(self):
        user_input = self.input_text.get("1.0", tk.END).strip()
        if not user_input:
            return
            
        self.input_text.delete("1.0", tk.END)
        self._update_chat_display(f"你：\n{user_input}", is_user=True)
        
        # 添加到历史记录
        self.sessions[self.current_session]["history"].append({
            "role": "user",
            "content": user_input
        })
        
        # 启动流式响应线程
        threading.Thread(
            target=self._get_api_response,
            args=(user_input,),
            daemon=True
        ).start()
        self.streaming = True
        self.after(50, self._stream_writer)
        
    def _get_api_response(self, prompt: str):
        try:
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {API_KEY}"
            }
            
            payload = {
                "model": "deepseek-chat",
                "messages": self.sessions[self.current_session]["history"],
                "temperature": 0.7,
                "max_tokens": 1000,
                "stream": True
            }
            
            response = requests.post(
                DEEPSEEK_API_URL,
                headers=headers,
                json=payload,
                stream=True,
                timeout=30
            )
            response.raise_for_status()
            
            full_response = ""
            for chunk in response.iter_lines():
                if chunk:
                    data = json.loads(chunk.decode("utf-8"))
                    print(data)
                    if "content" in data["choices"][0]["delta"]:
                        delta = data["choices"][0]["delta"]["content"]
                        full_response += delta
                        self.response_queue.put(delta)
                        time.sleep(0.02)  # 打字机速度
                        
            # 将完整响应添加到历史记录
            self.sessions[self.current_session]["history"].append({
                "role": "assistant",
                "content": full_response
            })
            
        except Exception as e:
            self.response_queue.put(f"\n[错误：{str(e)}]")
        finally:
            self.streaming = False
            
    def save_session(self):
        filename = filedialog.asksaveasfilename(
            initialdir=SAVE_DIR,
            defaultextension=".json",
            filetypes=[("JSON Files", "*.json")]
        )
        if filename:
            session_data = {
                "system_prompt": self.sessions[self.current_session]["system_prompt"],
                "history": self.sessions[self.current_session]["history"],
                "created": self.sessions[self.current_session]["created"].isoformat()
            }
            with open(filename, "w", encoding="utf-8") as f:
                json.dump(session_data, f, ensure_ascii=False)
            self._update_status(f"会话已保存到：{filename}")
            
    def load_session(self):
        filename = filedialog.askopenfilename(
            initialdir=SAVE_DIR,
            filetypes=[("JSON Files", "*.json")]
        )
        if filename:
            try:
                with open(filename, "r", encoding="utf-8") as f:
                    data = json.load(f)
                session_id = Path(filename).stem
                self.sessions[session_id] = {
                    "system_prompt": data["system_prompt"],
                    "history": data["history"],
                    "created": datetime.fromisoformat(data["created"])
                }
                self.session_list.insert(tk.END, session_id)
                self._update_status(f"已加载会话：{session_id}")
            except Exception as e:
                messagebox.showerror("错误", f"加载失败：{str(e)}")
                
    def set_system_prompt(self):
        new_prompt = simpledialog.askstring(
            "系统提示设置",
            "输入新的系统提示：",
            initialvalue=self.sessions[self.current_session]["system_prompt"]
        )
        if new_prompt:
            self.sessions[self.current_session]["system_prompt"] = new_prompt
            self.sessions[self.current_session]["history"][0]["content"] = new_prompt
            self._update_status(f"系统提示已更新：{new_prompt}")
            
    def show_settings(self):
        # 可扩展添加更多设置项
        messagebox.showinfo("设置", "当前模型：deepseek-chat\n温度：0.7")
        
    def _update_status(self, message: str):
        self.status_bar.config(text=message)
        self.after(5000, lambda: self.status_bar.config(text="就绪"))
        
    def run(self):
        # 配置文本样式
        self.chat_history.tag_config("user", foreground="blue")
        self.chat_history.tag_config("assistant", foreground="green")
        self.chat_history.tag_config("stream", foreground="black")
        self.mainloop()

if __name__ == "__main__":
    if not API_KEY:
        print("错误：请设置DEEPSEEK_API_KEY环境变量")
    else:
        app = DeepSeekGUI()
        app.run()