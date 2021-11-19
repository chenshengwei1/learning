// 导入 mongoose 模块
const dbmgr = require('../dbmgr/ConnectMgr');

var customers = ()=>{
    return new Promise((solve, reject)=>{
        var SomeModel = dbmgr.getSchema('SomeModel');
        // SELECT name, age FROM Athlete WHERE sport='Tennis'
        SomeModel.find(
            { 'sport': 'Tennis' },
            'name age',
            function (err, result) {
                console.log('query SomeModel result ' + JSON.stringify(result));
                if (err) {
                    return reject(err);
                } // 'athletes' 中保存一个符合条件的运动员的列表
                else{
                    solve(result);
                }
            }
        );
    })
}


var add = (customerInfo)=>{
    return new Promise((solve, reject)=>{
        var SomeModel = dbmgr.getSchema('SomeModel');
        customerInfo = customerInfo||{};


        // 创建一个 SomeModel 模型的实例

        var newInst = {name: customerInfo.name,
            binary: customerInfo.binary,
            living: customerInfo.living,
            updated: customerInfo.updated || Date.now,
            age: customerInfo.age,
            mixed: Schema.Types.Mixed,
            _someId: Schema.Types.ObjectId,
            array: customerInfo.array,
            ofString: customerInfo.ofString, // 其他类型也可使用数组
            nested: customerInfo.nested};
        const awesome_instance = new SomeModel(newInst);

        // 传递回调以保存这个新建的模型实例
        awesome_instance.save( function (err) {
            if (err) {
                return handleError(err);
            } // 已保存
        });

        return awesome_instance;
    })
}


var remove = (customerInfo)=>{
    return new Promise((solve, reject)=>{
        var SomeModel = dbmgr.getSchema('SomeModel');
        customerInfo = customerInfo||{};


        // 创建一个 SomeModel 模型的实例

        var newInst = {name: customerInfo.name,
            binary: customerInfo.binary,
            living: customerInfo.living,
            updated: customerInfo.updated || Date.now,
            age: customerInfo.age,
            mixed: Schema.Types.Mixed,
            _someId: Schema.Types.ObjectId,
            array: customerInfo.array,
            ofString: customerInfo.ofString, // 其他类型也可使用数组
            nested: customerInfo.nested};
        const awesome_instance = new SomeModel(newInst);

        // 传递回调以保存这个新建的模型实例
        awesome_instance.save( function (err) {
            if (err) {
                return handleError(err);
            } // 已保存
        });

        return awesome_instance;
    })
}



module.exports = {add, customers, remove};