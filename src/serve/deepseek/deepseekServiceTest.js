const service = require('./deepseekService');
// service.chatWith('帮我提供一份金属价格表格').then(e=>{
//     console.log('response = ' + e)
// }).catch(e =>{
//     console.error(e);
// })

service.balance().then(e=>{
    console.log('response = ' + e)
}).catch(e =>{
    console.error(e);
})