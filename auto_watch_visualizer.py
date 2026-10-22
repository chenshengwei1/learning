# auto_watch_visualizer.py
import yaml
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import webbrowser
import time
import threading

class ConfigChangeHandler(FileSystemEventHandler):
    def __init__(self, config_path, output_path):
        self.config_path = config_path
        self.output_path = output_path
        self.viz = GraphVisualizer(config_path)
    
    def on_modified(self, event):
        if event.src_path.endswith(self.config_path):
            print("🔄 检测到配置变化，重新生成可视化...")
            self.viz = GraphVisualizer(self.config_path)
            self.viz.generate_html(self.output_path)
            print("✅ 可视化已更新，刷新浏览器即可查看")

def auto_watch(config_path="graph_config.yaml", output_path="graph_visualization.html"):
    # 首次生成
    viz = GraphVisualizer(config_path)
    viz.generate_html(output_path)
    webbrowser.open(output_path)
    
    # 监听文件变化
    event_handler = ConfigChangeHandler(config_path, output_path)
    observer = Observer()
    observer.schedule(event_handler, path=os.path.dirname(config_path), recursive=False)
    observer.start()
    
    print(f"👀 正在监听 {config_path} 的变化...")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()

# 使用
auto_watch()