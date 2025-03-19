const filemgr = require('./filemgr.js');


let readyFiles = [];
filemgr.listfiles('E:\\chrome-plugin-dev', readyFiles, null, -1).then(e=>{
    console.log('search files =' + readyFiles.length);
    //console.dir(readyFiles)
    let findResult = filemgr.find('E:\\chrome-plugin-dev\\noadplugin');
    console.log('findResult files =' + findResult);
    let sub = filemgr.getSubFiles('E:\\chrome-plugin-dev\\noadplugin');
    console.log('getSubFiles files =' + sub);

    let isSubFiles = filemgr.isSubFiles('E:\\chrome-plugin-dev', 'E:\\chrome-plugin-dev\\noadplugin');
    console.log('isSubFiles files =' + isSubFiles);

    let refile = [];
    filemgr.listfiles('E:\\chrome-plugin-dev', refile, null, -1).then(s=>{
        console.log('research files =' + s.length);
    })
})
