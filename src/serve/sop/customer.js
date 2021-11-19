// wiki.js - 维基路由模块

const express = require('express');
const router = express.Router();

// 主页路由
router.get('/', (req, res) => {
    console.log('正在访问维基主页!');
    res.send('维基主页');
});

// “关于页面”路由
router.get('/about', (req, res) => {
    console.log('正在访问关于此维基');
    res.send('关于此维基');
});

// “关于页面”路由
router.get(/.*/, (req, res) => {
    console.log('正在访问维基 - ' + req.url);
    res.send('关于'+  req.url + '维基');
});

module.exports = router;