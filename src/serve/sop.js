// wiki.js - 维基路由模块

const express = require('express');
const router = express.Router();
const path = require('path')
const cmgr = require('./sop/customerSev');



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
router.get('/customer', (req, res) => {
    console.log('正在访问关于此维基');
    cmgr.customers().then((solve, reject)=>{
        res.send('关于'+ JSON.stringify(solve || {}) + '维基');
    })
});

router.use(express.static(path.join(__dirname, 'sop')));

// “关于页面”路由
//router.use('/customer', customer);

// “关于页面”路由
router.get(/.*/, (req, res) => {
    console.log('正在访问维基 - ' + req.url);
    res.send('关于'+  req.url + '维基');
});

module.exports = router;