// 导入 mongoose 模块
const mongoose = require('mongoose');

// 设置默认 mongoose 连接
const mongoDB = 'mongodb://localhost:27017/MongoDB';
mongoose.connect(mongoDB);
// 让 mongoose 使用全局 Promise 库
mongoose.Promise = global.Promise;
// 取得默认连接
const db = mongoose.connection;


// 将连接与错误事件绑定（以获得连接错误的提示）
db.on('error', console.error.bind(console, 'MongoDB 连接错误：'));


// 定义模式
const Schema = mongoose.Schema;

const SomeModelSchema = new Schema(
  {
    name: String,
    binary: Buffer,
    living: Boolean,
    sport:String,
    updated: { type: Date, default: Date.now },
    age: { type: Number, min: 18, max: 65, required: true },
    mixed: Schema.Types.Mixed,
    _someId: Schema.Types.ObjectId,
    array: [],
    ofString: [String], // 其他类型也可使用数组
    nested: { stuff: { type: String, lowercase: true, trim: true } }
  });

var handleError = function(err){
  console.log('handleError ' + err);
}

// 使用模式“编译”模型
const SomeModel = mongoose.model('SomeModel', SomeModelSchema);

const small = new SomeModel({ name: 'small' , age: 18});
small.save(function (err) {
  if (err) return handleError(err);
  // saved!
});

// 创建一个 SomeModel 模型的实例
const awesome_instance = new SomeModel({ name: '牛人', age: 18});

// 传递回调以保存这个新建的模型实例
awesome_instance.save( function (err) {
  if (err) {
    return handleError(err);
  } // 已保存
});

// 使用圆点来访问模型的字段值
console.log('控制台将显示' + awesome_instance.name); // 控制台将显示 '也是牛人'

// 修改字段内容并调用 save() 以修改记录
awesome_instance.name = "酷毙了的牛人";
awesome_instance.updateOne( function(err) {
   if (err) {
     return handleError(err);
   } // 已保存
});


// 创建一个 SomeModel 模型的实例
const Tennis = new SomeModel({ name: '牛人', age: 18, sport: 'Tennis'});

// 传递回调以保存这个新建的模型实例
Tennis.save( function (err) {
  if (err) {
    return handleError(err);
  } // 已保存
});
