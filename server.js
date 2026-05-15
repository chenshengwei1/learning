const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// 设置视图引擎
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 静态资源
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ========== 数据文件路径 ==========
const PAGES_DATA_PATH = path.join(__dirname, 'data', 'pages.json');

// 读取页面索引数据
function getPagesData() {
  try {
    const data = fs.readFileSync(PAGES_DATA_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// 保存页面索引数据
function savePagesData(pages) {
  fs.writeFileSync(PAGES_DATA_PATH, JSON.stringify(pages, null, 2), 'utf-8');
}

// ========== 路由 ==========

// 首页 - 显示所有学习页面列表
app.get('/', (req, res) => {
  const pages = getPagesData();
  res.render('index', { pages });
});

// 查看单个学习页面
app.get('/page/:id', (req, res) => {
  const pages = getPagesData();
  const page = pages.find(p => p.id === req.params.id);
  if (!page) {
    return res.status(404).send('页面不存在');
  }

  const filePath = path.join(__dirname, 'pages', page.filename);
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    res.render('page', { page, content });
  } catch {
    res.status(404).send('页面文件不存在');
  }
});

// 创建新页面 - 显示表单
app.get('/create', (req, res) => {
  res.render('create');
});

// 创建新页面 - 提交表单
app.post('/create', (req, res) => {
  const { title, category, content } = req.body;
  if (!title || !content) {
    return res.status(400).send('标题和内容不能为空');
  }

  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const filename = `${id}.html`;

  // 保存页面文件
  const filePath = path.join(__dirname, 'pages', filename);
  const htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link rel="stylesheet" href="/css/style.css">
</head>
<body>
  <div class="page-container">
    <h1>${title}</h1>
    <div class="page-meta">
      <span class="category">${category || '未分类'}</span>
      <span class="date">${new Date().toLocaleDateString('zh-CN')}</span>
    </div>
    <div class="page-content">
      ${content}
    </div>
    <a href="/" class="back-link">← 返回首页</a>
  </div>
</body>
</html>`;

  fs.writeFileSync(filePath, htmlContent, 'utf-8');

  // 更新索引
  const pages = getPagesData();
  pages.push({
    id,
    title,
    category: category || '未分类',
    filename,
    createdAt: new Date().toISOString()
  });
  savePagesData(pages);

  res.redirect(`/page/${id}`);
});

// 删除页面
app.post('/page/:id/delete', (req, res) => {
  let pages = getPagesData();
  const page = pages.find(p => p.id === req.params.id);
  if (!page) {
    return res.status(404).send('页面不存在');
  }

  // 删除文件
  const filePath = path.join(__dirname, 'pages', page.filename);
  try {
    fs.unlinkSync(filePath);
  } catch (e) {
    console.error('删除文件失败:', e.message);
  }

  // 更新索引
  pages = pages.filter(p => p.id !== req.params.id);
  savePagesData(pages);

  res.redirect('/');
});

// ========== 启动服务器 ==========
app.listen(PORT, () => {
  console.log(`📚 Leaning 学习知识库已启动！`);
  console.log(`🌐 访问地址: http://localhost:${PORT}`);
});
