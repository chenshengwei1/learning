var fs = require('fs');
var url = require('url');

var path = require('path');


var readAsText = (file)=>{
    if (fs.existsSync(file)){
        return fs.readFileSync(file).toString();
    }
    return 'file not found';
}

var listfiles = (root)=>{
    //console.log('正在读取file=' + root);
    if (!root){
        root = 'c:/doc/';
    }else{
        if (root.toLocaleLowerCase().indexOf('c:') == -1){
            root = path.join('c:', encodeURI(root));
        }
    }
    if (root[root.length - 1] != '/' && root[root.length - 1] != '\\'){
        root = root + '/';
    }
    let readyFiles = [];
    

     return new Promise((resolved, rejected)=>{
        if (fs.lstatSync(root).isDirectory()){
            fs.readdir(root, function(err, files){
                if (err) {
                    return console.error(err);
                }
                files.forEach((file)=>{
                    let isdir= false;
                    let size = 0;
                    try{
                        let stat = fs.lstatSync(path.join(root, file));
                        isdir = stat.isDirectory();
                        size = stat.size;
                    }catch(exception){}
                    readyFiles.push({dir:root, file:file, isDirectory:isdir, size: size});
                });
                resolved(readyFiles);
             });
        }else{
            resolved(readyFiles);
        }
        
     })
}


var listDeepfiles = (root, readyFiles, monitor)=>{
    //console.log('正在读取file=' + root);
    if (!root){
        root = 'c:/doc/';
    }
    readyFiles = readyFiles || [];
    

     return new Promise((resolved, rejected)=>{
        let lstatSync = null;
         try {
             lstatSync = fs.lstatSync(root);
             readyFiles.push({path:root, isDirectory:lstatSync.isDirectory(), ...lstatSync});
        }catch(e){
            resolved(readyFiles);
            return;
        }
        if (lstatSync.isDirectory()){
            fs.readdir(root, (err, files)=>{
                if (err) {
                    return console.error(err);
                }
                setTimeout(()=>{
                    let waits = [];
                    files.forEach((file)=>{
                        let isdir= false;
                        try{
                            let sublstatSync = fs.lstatSync(path.join(root, file));
                            isdir = sublstatSync.isDirectory();
                            readyFiles.push({path: path.join(root, file), isDirectory:isdir, ...sublstatSync});
                            if (isdir){
                                let r = listDeepfiles(path.join(root, file), readyFiles, monitor);
                                waits.push(r); 
                            }
                        }catch(exception){}
                        //readyFiles.push({dir:root, file:file, isDirectory:isdir});
                    });
                    if (monitor){
                        monitor(readyFiles);
                    }
                    Promise.all(waits).then(e=>{
                        resolved(readyFiles);
                    })
                },0)
                
             });
        }else{
            resolved(readyFiles);
        }
        
     })
}

let fileMaps = {};

var fileFilter = (keyword, base)=>{
    if (!keyword){
        return fileMaps[base];
    }
    let words = keyword.toLocaleLowerCase().split(';');
    let result = fileMaps[base].filter(item=>{
        for (let word of words){
            if (item.path.toLocaleLowerCase().indexOf(word) != -1){
                return true;
            }
        }
        return false;
    });
    return result;
}

var search = (keyword, fromPath, monitor)=>{
    let path = 'C:\\doc\\doc';
    fromPath = fromPath || path;
    console.log('正在搜索keyword=' + keyword);
     return new Promise((resolved, rejected)=>{
        if (fileMaps[fromPath]?.length){
            resolved(fileFilter(keyword, fromPath))
        }else{
            let allSearchFiles = [];
            let startLength = 0;
            let processingTime = Date.now();
            listDeepfiles(fromPath, allSearchFiles, (tempDatas)=>{
                if (Date.now() - processingTime < 1000){
                    return;
                }
                processingTime = Date.now();
                fileMaps[fromPath] = allSearchFiles.slice(startLength, allSearchFiles.length);
                monitor(fileFilter(keyword, fromPath));
                startLength = allSearchFiles.length;
            }).then(allFiles =>{
                fileMaps[fromPath] = allFiles;
                resolved(fileFilter(keyword, fromPath))
            });
        }
     })
}

module.exports = {listfiles, listDeepfiles, search, readAsText};