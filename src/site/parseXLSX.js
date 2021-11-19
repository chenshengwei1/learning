var xlsx = require('node-xlsx').default;
var fs = require('fs');
var logger = require('./locallog');
var objects = require('./obj');

console.log(objects.objs['01I1s000000A2BA']);
var readXlsx = function(){
    // parse方法的参数为要解析的excel的路径
    //var list = xlsx.parse('D:/doc/Ruby Com/schemal.xlsx');
    var list = xlsx.parse('test2.xlsx');
    
    // 输出数据
    logger.info(JSON.stringify(list,'','\t'));
}

//readXlsx();

var writeXlsx = function(){

    var tables = [];
    logger.info('ID\t|Label\t|Table Name\t|Cust|');
    for(let key in objects.objs){
        let tabObj = objects.objs[key];

        tables.push({
            objId:key,
            label:tabObj.l,
            tableName:tabObj.n,
            isCustome:tabObj.cust
        });
        logger.info(`${key}\t|${tabObj.l}\t|${tabObj.n}\t|${tabObj.cust}|`);
        
    }
    var datatitle = ['name','age','geneder'];
    var data1 = ['jack','18','man'];
    var data2 = ['Rose',null,'man'];
    var arrs = [datatitle, data1, data2];
    //arrs.push(...tables);
    var buffer = xlsx.build([{name:'mySheetName', data:arrs}]);
    //fs.writeFileSync('test2.xlsx', buffer);
    console.table(tables);
}
writeXlsx();