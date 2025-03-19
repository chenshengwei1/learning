from flask import Flask, request, send_from_directory, Response, render_template
import requests
import os
#from flask_socketio import SocketIO, emit
#socketio = SocketIO(app, cors_allowed_origins="*")

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key'
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# 文件上传接口
@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return 'No file part', 400
    file = request.files['file']
    if file.filename == '':
        return 'No selected file', 400
    file.save(os.path.join(UPLOAD_FOLDER, file.filename))
    return 'File uploaded successfully'

# 文件下载接口
@app.route('/download/<filename>')
def download_file(filename):
    return send_from_directory(UPLOAD_FOLDER, filename, as_attachment=True)

@app.errorhandler(404)
def page_not_found(e):
    return render_template('404.html'), 404

# 网页访问接口
@app.route('/')
def index():
    # 重定向到另一个网页
    print('重定向到http://127.0.0.1:3000'+request.url)
    return app.redirect(url_for('serve', url='http://127.0.0.1:3000'))

def serve(url):
    return app.redirect(url)

def url_for(*args, **kwargs):
    return app.url_for(*args, **kwargs)

@app.route('/browse')
def browse_files():
    # 获取相对路径参数（默认根目录）
    relative_path = request.args.get('path', '')
    
    # 设置基础安全目录
    BASE_DIR = os.path.abspath(UPLOAD_FOLDER)
    target_path = os.path.join(BASE_DIR, relative_path)
    
    # 安全验证（防止目录遍历）
    if not os.path.abspath(target_path).startswith(BASE_DIR):
        app.abort(403, description="Access denied")
    
    # 处理文件请求
    if os.path.isfile(target_path):
        return send_from_directory(BASE_DIR, relative_path)
    
    # 处理目录请求
    try:
        files = [f for f in os.listdir(target_path) 
                if os.path.isfile(os.path.join(target_path, f)) 
                and not f.startswith('.')]  # 过滤隐藏文件
        return jsonify({"path": relative_path, "files": files})
    except FileNotFoundError:
        app.abort(404, description="Directory not found")

@app.route('/redirect/<path:url>')
def custom_redirect(url):
    # 获取状态码参数（默认302）
    code = request.args.get('code', 302, type=int)
    
    # 安全验证（可选生产环境扩展）
    # if not url.startswith(('http://', 'https://')):
    #     abort(400)
    
    # 仅允许标准重定向状态码
    if code not in (301, 302, 303, 305, 307, 308):
        app.abort(400, description="Invalid redirect status code")
        
    return redirect(url, code=code)

@app.route('/easyfile/<path:filename>')
def serve_test_files(filename):
    # 设置基础目录
    BASE_DIR = os.path.join(os.getcwd(),'src', 'webapp', 'easyfile')
    os.makedirs(BASE_DIR, exist_ok=True)
    
    # 构建绝对路径并验证安全性
    target_path = os.path.join(BASE_DIR, filename)
    print('target_path='+target_path)
    print('BASE_DIR='+os.path.abspath(BASE_DIR))
    if not os.path.abspath(target_path).startswith(os.path.abspath(BASE_DIR)):
        send(404)
    
    # 返回文件或404
    if os.path.isfile(target_path):
        return send_from_directory(BASE_DIR, filename)
    _404Path = os.path.join(os.getcwd(),'src', 'webapp')
    return send_from_directory(_404Path, '404.html')

# 代理功能
@app.route('/proxy/<path:url>', methods=['GET', 'POST', 'PUT', 'DELETE'])
def proxy(url):
    try:
        resp = requests.request(
            method=request.method,
            url=url,
            headers={key: value for (key, value) in request.headers if key != 'Host'},
            data=request.get_data(),
            cookies=request.cookies,
            allow_redirects=False)
        headers = [(name, value) for (name, value) in resp.raw.headers.items()]
        return Response(resp.content, resp.status_code, headers)
    except Exception as e:
        return str(e), 500

@app.route('/chat')
def chat():
    return render_template('chat.html')


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3002, threaded=True)