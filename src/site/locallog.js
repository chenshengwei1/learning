//testLog4.js
var log4js = require('log4js');



/*
  类型分类
 */
//实例化时，唯一可以传的一个参数category
var logger = log4js.getLogger('随便起名字啦');
logger.trace('this is trace');
logger.debug('this is debug');
logger.info('this is info');
logger.warn('this is warn');
logger.error('this is error');
logger.fatal('this is fatal');

log4js.configure({
	appenders: {
		out: { 
            type: 'file', 
            filename: 'pm2logs.log' 
        }
	},
	categories: {
		default: { appenders: ['out'], level: 'info' }
	},
	pm2: true,
	pm2InstanceVar: 'INSTANCE_ID'
});

  var logger1 = log4js.getLogger('npm test');
  logger1.info('this no error');

module.exports = logger1;

  //testLog4.js
/*
  dateFile，根据时间保存文件位置，文件自动创建
 */
// log4js.configure({
//     appenders:[{
//       type: 'dateFile',
//       //文件名为= filename + pattern, 设置为alwaysIncludePattern：true
//       filename: '234',
//       pattern: '-yyyy-MM-dd.log',
//       //包含模型
//       alwaysIncludePattern: true,
//     }]
//   })
//   var logger = log4js.getLogger();
//   logger.info('this is datefile');
  

/*
  loglevelFilter 过滤筛选
 */

//   log4js.configure({
//     appenders:[
//       //控制台输出
//       {"type": "console"},
//       { //日志过滤
//         type: 'loglevelFilter',
//         //  权重大于或者等于level【debug】的日志将会输出
//         level: 'WARN',
//         //筛选model1
//         category: 'model1',
//         // 同时支持数组
//         // category:['model1', 'model2'],
//         appender:{
//           type: 'file',
//           filename: '345.log'
//         }
//       }
//     ],
//     "replaceConsole": true
  
//   })
  
//   var logger = log4js.getLogger('model1');
//   logger.trace('this is trace');
//   logger.debug('this is debug');
//   logger.info('this is info');
//   logger.warn('this is warn');
//   logger.error('this is error');
//   logger.fatal('this is fatal');
  
//   var logger = log4js.getLogger('model2');
//   logger.trace('this is trace');
//   logger.debug('this is debug');
//   logger.info('this is info');
//   logger.warn('this is warn');
//   logger.error('this is error');
//   logger.fatal('this is fatal');
  