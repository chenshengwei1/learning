const express = require('express');
const app = express();
const morgan = require('morgan');
var uuid = require('node-uuid');

var fs = require('fs')

var path = require('path')
//var rfs = require('rotating-file-stream')

const sop = require('./sop.js');

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

app.get('/', (req, res) => {
    console.log('正在访问app.get(/)!');
    res.send('Hello World! 示例应用正在监听 3000 端口!');
});

app.listen(3000, () => {
  console.log('示例应用正在监听 3000 端口!');
});


app.all(/.*/, (req, res, next) => {
    console.log('访问所有路径文件 ...');
    res.send('该功能尚未实现，敬请期待！请转到 https://developer.mozilla.org/zh-CN/docs/learn/Server-side/Express_Nodejs/routes');
  });