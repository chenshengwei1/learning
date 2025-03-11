const express = require('express');
const app = express();
const morgan = require('morgan');
var uuid = require('node-uuid');

var fs = require('fs');
var url = require('url');
var multer = require('multer');

var path = require('path')
//var rfs = require('rotating-file-stream')

const sop = require('./sop.js');
const api = require('./sop/api.js');
const root = require('./root.js');
const filemgr = require('./files/fileMgr.js');
const cacheMgr = require('./cache/cacheMgr.js');
const easyfilerouter = require('./sop/easyfilerouter.js');



app.use(express.json()) // for parsing application/json
app.use(express.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded


morgan.token('id', function getId (req) {
    return req.id
  });

app.use((req, res, next)=> {
    req.id = uuid.v4();
    next();
})

//标准Apache组合日志输出
//app.use(morgan('combined'));

//将日志输出到access.log日志文件里
var loggerEveryFile = ()=>{
    // create a write stream (in append mode)
    var accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' })
    return morgan('combined', { stream: accessLogStream });
}
 
// setup the logger
app.use(loggerEveryFile());


//app.use(morgan(':method :host :status :param[id] :res[content-length] - :response-time ms'));

// 每天生成日志文件，并且放到制定目录下
var loggerEveryDate = ()=>{
    var logDirectory = path.join(__dirname, 'log')
 
    // ensure log directory exists
    fs.existsSync(logDirectory) || fs.mkdirSync(logDirectory);
    
    // create a rotating write stream
    let accessLogStream = rfs.getStream({
        date_format: 'YYYYMMDD', // 日期格式
        filename: path.join(logDirectory, 'morgan_%DATE%.log'), //日志文件名称
        frequency: 'daily', //
        verbose: false
    });

    return morgan('combined', { stream: accessLogStream });
}

// setup the logger
//app.use(loggerEveryDate());

app.all('/', (req, res, next) => {
    console.log('访问私有文件 ...');
    next(); // 控制权传递给下一个处理器
  });

// 可以通过下面一行来托管 'public' 文件夹（应位于 Node 调用的同一级）中的文件：
// 现在 'public' 文件夹下的所有文件均可通过在根 URL 后直接添加文件名来访问了，比如：
/**
 * http://localhost:3000/images/dog.jpg
    http://localhost:3000/css/style.css
    http://localhost:3000/js/app.js
    http://localhost:3000/about.html
 */
app.use(express.static('public'));

app.use('/sop', sop);
app.use('/easyfile', easyfilerouter);
app.use('/download', express.static('uploads'));

// 目录结构接口
app.get('/sys/files', (req, res) => {
  filemgr.listfiles('uploads').then(files=>{
      const fileList = files.map(file => ({
        name: file.file,
        type: file.isDirectory ? 'dir' : 'file',
        size: file.size
      }));
      res.json(fileList);
  }).catch(e=>{

  });
});

// 修改后的server.js

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    cb(null, file.originalname) // 保留原始文件名
  }
})

// 配置multer取消限制
const upload = multer({
    storage: storage, // 替换原dest配置
    limits: { fileSize: Infinity }, // 取消大小限制
  });
  
// 修改上传接口处理多文件
app.post('/upload', upload.array('files'), (req, res) => {  // 使用array方法
    for (let i = 0; i < req.files.length; i++) {
      console.log('文件类型：%s', req.files[i].mimetype);
      console.log('原始文件名：%s', req.files[i].originalname);
      console.log('文件大小：%s', req.files[i].size);
      console.log('文件保存路径：%s', req.files[i].path);
    }
    res.status(200).send(req.files);
  });


app.use('/test', (req, res) => {
    //console.log('正在访问test');
    // 解析请求，包括文件名
   var pathname = url.parse(req.url).pathname;
   
   // 输出请求的文件名
   console.log("Request for " + pathname + " received.");
   let dir = 'C:/doc/virco/test';
   let filepath = path.join(dir, pathname.substring(1));
   res.sendFile(filepath);

    // 从文件系统中读取请求的文件内容
    // fs.readFile(filepath,  (err, data)=> {
    //     if (err) {
    //         console.log(err);
    //         // HTTP 状态码: 404 : NOT FOUND
    //         // Content Type: text/html
    //         res.writeHead(404, {'Content-Type': 'text/html'});
    //     }else{             
    //         // HTTP 状态码: 200 : OK
    //         // Content Type: text/html
    //         res.writeHead(200, {'Content-Type': 'text/html'});    
            
    //         // 响应文件内容
    //         res.write(data.toString());        
    //     }
    //     //  发送响应数据
    //     res.end();
    // }); 
});

app.use('/api', api);


app.use('/file', (req, res) => {
    var pathname = url.parse(req.url).pathname;
    console.log('正在访问file=' + pathname);
    console.log('正在访问file query=' + req.query.path);
    pathname = req.query.path || pathname;
    // 解析请求，包括文件名
   let subpath = pathname.split(path.sep);
   try{
       filemgr.listfiles(subpath.length > 0 ? subpath.join('/') : '').then(content =>{
            res.json(JSON.stringify(content) );
       }).catch(e=>{
        console.log('无法访问file=' + pathname);
        res.json(JSON.stringify({error:e}));
       })
   }
   catch(e){
        res.json(JSON.stringify({error:e}));
   }
});


app.get('/filedownload', (req, res) => {
  var pathname = url.parse(req.url).pathname;
  console.log('正在访问file=' + pathname);
  console.log('正在访问file query=' + req.query.path);
  pathname = req.query.path || pathname;
  let filename = req.query.name || 'file';

  const file = path.join(pathname, filename);
  
  res.set({
    'Content-Type': 'application/octet-stream',
    'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`
  });

  fs.createReadStream(file)
    .on('error', () => res.status(404).end())
    .pipe(res);
});

app.use('/filecontent', (req, res) => {
  var pathname = url.parse(req.url).pathname;
  console.log('正在访问file=' + pathname);
  console.log('正在访问file query=' + req.query.path);
  pathname = req.query.path || pathname;
 try{
     let content = filemgr.readAsText(pathname);
      console.log('success to file query=' + content.length);  
      res.send(content);
 }
 catch(e){
       console.log('catch query=' + e);
      res.json(JSON.stringify({error:e}));
 }
});
app.use('/resource.root', root);


app.post('/files/search', (req, res) => {
    console.log('正在搜索/api/search searchKey=' + req.body.searchKey);
    let requestTime = Date.now();
    res.json({datas:[], done:true, success:true,  costTime:Date.now() - requestTime} );
    // 解析请求，包括文件名
//    try{
//        let reqBodyJson = req.body||{};
//        let isDone = false;
//        let responseDone = false;
//        console.log('rquestId = ' + (req.body.rquestId));
//        console.log('cross time from client to service = ' + (requestTime - req.body.rquestId));
       
//        if (reqBodyJson.lastRecordId){
//             let data = cacheMgr.getData(reqBodyJson.lastRecordId);
//             if (data){
//                 console.log('结束搜索/api/search searchKey3=' , data.data.length);
//                 if (data.done){
//                     res.json({datas:data.data||[], done:data.done, success:true, costTime:Date.now() - requestTime} );
//                 }else{
//                     res.json({datas:data.data||[], done:data.done, success:true, lastRecordId:reqBodyJson.lastRecordId, costTime:Date.now() - requestTime} );
//                 }
//                 return;
//             } 
//        }
       
       
//         let requestId = Date.now();
//         let searchResultLength = 0
        
//         filemgr.search(reqBodyJson.searchKey, reqBodyJson.base || 'C:\\doc\\doc', (datas)=>{
//             let dataFromCache = cacheMgr.getData(requestId) || {data:[]};
//             searchResultLength += datas.length;
//             if (!isDone){
//                 console.log('processing=' + datas.length +'##'+ dataFromCache.data.length + '##' + searchResultLength);
//                 cacheMgr.setData(requestId, {data:datas.concat(dataFromCache.data), done:isDone});
//             }
//             if (!responseDone){
//                 //res.append({ datalength: datas.length });
//                 responseDone = true;
//                 res.json({datas:datas.concat(dataFromCache.data), done:false, lastRecordId:requestId, success:true, costTime:Date.now() - requestTime} );
//             }
//         }).then(content =>{
//             isDone = true;
//             cacheMgr.setData(requestId, {data:content, done:isDone});
//             console.log('结束搜索/api/search searchKey=' + reqBodyJson.searchKey);
//             //res.json(JSON.stringify({datas:content, done:true}) );
//             if (!responseDone){
//                 //res.append({ datalength: datas.length });
//                 responseDone = true;
//                 console.log('结束搜索/api/search searchKey2=' + reqBodyJson.searchKey);
//                 res.json({datas:content, done:true, success:true, costTime:Date.now() - requestTime} );
//             }
//         })
       
//    }
//    catch(e){
//     console.log('结束搜索/api/search end error=' + e.stack);
//         res.json({error:e, success:false, done:true, datas:[], costTime:Date.now() - requestTime});
//    }
});

app.get('/', (req, res) => {
    console.log('正在访问app.get(/)!');
    res.send(`Hello World! 示例应用正在监听 3000 端口! <a href="javascript:location.href='http://localhost:3000/test/test.html'">访问测试网页</a>`);
});

app.listen(3000, () => {
  console.log('示例应用正在监听 3000 端口!');
});


app.all(/.*/, (req, res, next) => {
    var pathname = url.parse(req.url).pathname;
    console.log('访问无效路径文件1 ...>>' + req.url);
    console.log('访问无效路径文件2 ...>>' + req.path);
    console.log('访问无效路径文件3 ...>>' + req.baseUrl);
    res.status(404).send('Sorry, we cannot find that!');
  });