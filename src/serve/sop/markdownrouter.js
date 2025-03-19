// wiki.js - 维基路由模块

const express = require('express');
const router = express.Router();
const path = require('path')
const lpsConsts = require('./../lpsConst.js');
const filemgr = require('./../files/filemgr.js');

// 主页路由
router.use(express.static(path.join(lpsConsts.BASE_SERVER_PATH,'..','webapp/markdown')));
router.get('/', (req, res) => {
    console.log('正在访问easyfile主页!');
    //res.send('维基主页');
    console.log('redirct to  - ' + path.join(lpsConsts.BASE_SERVER_PATH,'..','webapp/markdown/markdown.html'))
    res.sendFile(path.join(lpsConsts.BASE_SERVER_PATH,'..','webapp/markdown/markdown.html'));
    //res.redirect(path.join(lpsConsts.BASE_SERVER_PATH,'..','webapp/easyfile/easyfile.html'));
});

// “关于页面”路由
router.get('/about', (req, res) => {
    console.log('正在访问关于markdown');
    res.send('easy file about page');
});

// 定向到同名的easyfile目录
router.get(/.*/, (req, res) => {
    console.log('markdown - ' + req.url);
    if (req.url.match(/^\/files\/.*/)){
        
    }
    res.send('markdown any page');
});

module.exports = router;