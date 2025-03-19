// wiki.js - 维基路由模块

const express = require('express');
const router = express.Router();
const path = require('path')
const lpsConsts = require('./lpsConst.js');
const filemgr = require('./files/filemgr.js');


// 主页路由
router.get('/', (req, res) => {
    console.log('正在访问lps主页!'+req.url);
    res.sendFile(path.join(lpsConsts.BASE_SERVER_PATH,'..','test/test.html'));
});


router.post('/search', (req, res) => {
    console.log('正在搜索!' , req.body);
    let body = req.body;

    let allPaths = [];
    filemgr.listfiles(body.path, allPaths, ()=>{

    }, -1).then(e=>{
        //res.sendFile(path.join(lpsConsts.BASE_SERVER_PATH,'..','test/test.html'));
    }).catch(e=>{
        console.error(e);
    }).finally(e=>{
        console.log('file match length=' + allPaths.length);
        let result = filemgr.search(allPaths, body.searchWord);
        console.log('match length=' + result.length);
        try{
            res.json({
                success: true,
                length:result.length,
                timer:Date.now(),
                paths:result
            });
        }catch(e1){
            res.json({
                success: false,
                length:result.length,
                timer:Date.now(),
                paths:allPaths.slice(0,1000)
            });
        }
    });

});


router.get('/load', (req, res) => {
    
    console.log('正在加载lps - ' + req.url);
    console.dir(req.query);
    let pt = req.query.path;
    
    res.sendFile(pt);
});

//router.use(express.static(path.join(__dirname, 'test')));

// “关于页面”路由
//router.use('/customer', customer);

// “关于页面”路由
router.get(/.*/, (req, res) => {
    console.log('正在访问lps - ' + req.url);
    console.log('req.baseUrl='+req.baseUrl);
    console.log('req.url='+req.url);
    console.log('req.originalUrl='+req.originalUrl);
    res.sendFile(path.join(lpsConsts.BASE_SERVER_PATH,'..','test/'+req.url));
});

module.exports = router;