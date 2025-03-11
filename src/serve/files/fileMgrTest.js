//import fileMgr from './fileMgr.js';
var fileMgr = require('./fileMgr');
console.log('run test start');
let content = fileMgr.readAsText('C:\\doc\\work\\pentaho_cvp7\\report and job\\report.log');
//console.log(content);

fileMgr.listfiles('C:/doc/work/pentaho_cvp7').then(content =>{
            console.log(JSON.stringify(content) );
       }).catch(e=>{
            console.log('无法访问file=' + e);
            console.log(JSON.stringify({error:e}));
       })


console.log('run test end');
