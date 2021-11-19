"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const FS = require('fs-extra');
const Path = require("path");
// xml -> JSON
const xml2js = require('xml2js').parseString;
var js2xml = require('xml2js');
// JSON -> xml
const builder = new js2xml.Builder({
    rootName: "entities"
});
class FileHandler {
    
    constructor() {
        this.promiseArray = [];
    }

    excludes(dir){
        this.excludeDir = this.excludeDir || [];
        this.excludeDir.push(dir);
    }
    /**
     * List files frome the given directory and optonal suffix filter.
     * @param dir, root directory.
     * @param callback, check spec below.
     * @param suffix, optonal, ".entity.xml|.bs.xml". List files with the suffix as filter, ignoring case of characters.
     */
    listDirFilesRecursively(dir, callback, suffix) {
        let count = 0;
        let suffixRegExp = new RegExp(`(${suffix})$`, "i");
        let files = FS.readdirSync(dir = Path.normalize(dir));
       
        files.forEach(file => {
            let filepath = Path.join(dir, file);
            if (this.excludeDir.indexOf(file) != -1){
                return;
            }
            if (FS.statSync(filepath).isDirectory()) {
                count += this.listDirFilesRecursively(filepath, callback, suffix);
            }
            else if (suffix ? filepath.toLocaleLowerCase().match(suffixRegExp) : true) {
                console.log(filepath);
                ++count;
                callback(Path.normalize(filepath), count);
            }
        });
        return count;
    }
    /**
     * Just like Array.prototype.map() function,
     *  Call the provided function for each file in the source directory(recursively), and make output to target directory.
     *
     * @param suffixFilter, format example: ".bs.xml|.entity.xml" or ".entity.xml"
     * @param contentMapFuncAsync, callback function with async mode.
     *      mapping and convertor the input string content, and call next(result) to tell the mapFiles to continue.
     * @param pathMapFunc,   Callback function, with input and output using the std node.js pathObject.
     *      sourceDir/a/b/c/s1.any
     *                |----------|
     *                  ^relativePath="a/b/c/s1.any",  Node.js standard path.parse() return:
     *                   PathObject:   { root: '',  dir: 'a/b/c',  base: 's1.any', ext: '.any', name: 's1' }
     *                       https://nodejs.org/api/path.html#path_path_parse_path
     *      targetDir/x/y/z/t1.what
     *                |-----------|   Converte pathObject into target pattern bu your rules,
     *                           then we use node.js path.format() to get target-path.
     *                       https://nodejs.org/api/path.html#path_path_format_pathobject
     */
    mapFiles(targetDir, sourceDir, suffixFilter, contentMapFunc, pathMapFunc) {
        // clean and ensure target output directory.
        this.mkdirSync(targetDir);


        // list all the files inside recursively, do the converte job by the given callback functions.
        this.listDirFilesRecursively(sourceDir, (srcFilepath, seq) => {
            let fileName = `${Path.basename(srcFilepath, suffixFilter)}${suffixFilter}`;
           
            let pro = new Promise((resolve, reject) => {
                FS.readFile(srcFilepath, (err, content) => {
                    if (content) {
                        resolve(content.toString().replace("\ufeff", ""));
                    }
                });
            }).then(content => {
                new Promise((resolve, reject) => {
                    xml2js(content, (err, json) => {
                        resolve(json);
                    });
                }).then(json => {
                    new Promise((resolve, reject) => {
                        let str = contentMapFunc(json, fileName, srcFilepath);
                        resolve(str);
                    }).then(str => {
                        let strPArray = [];
                        this.writeTarget(str, sourceDir, srcFilepath, targetDir, pathMapFunc, strPArray);
                        Promise.all(strPArray).then(result => {
                            new Promise((resolve, reject) => {
                                resolve("success");
                            });
                        });
                    });
                });
            });
            this.promiseArray.push(pro);
        }, suffixFilter);
    }
    /**
     * Just like Array.prototype.map() function,
     * Call the provided function for each XML file in the source directory(recursively), and make output to target directory.
     *
     * Similar to mapFiles(), while this contentMapFunc callback is synchronous.
     *
     * IMPORTANT: suffixFilter, must spec to *.xml files. Eg: .bs.xml, .entity.xml.
     */
    mapXmlFiles(targetDir, sourceDir, suffixFilter, contentMapFunc, pathMapFunc) {
        // call the async callback pattern version 'mapFiles', and handle the xml content for users.
        this.mapFiles(targetDir, sourceDir, suffixFilter, contentMapFunc, pathMapFunc);
    }
    //TODO
    writeTarget(arr, sourceDir, srcFilepath, targetDir, pathMapFunc, strPArray) {
        // Path Mapping. Map the source path into target path by rules of the given function.
        // let pArray = [];
        (arr||[]).forEach(result => {
            let sourceRelativePathObj = Path.parse(Path.relative(sourceDir, srcFilepath));
            if (result.package) {
                sourceRelativePathObj.name = result.package;
            }
            let targetRelativePathObj = pathMapFunc(sourceRelativePathObj);
            let targetFilepath = Path.resolve(targetDir, Path.format(targetRelativePathObj));
            // Write target.
            let temp = result.tsResult.replace(/(\r\n|\n|\r)/gm, "");
            if (temp.length == 0) {
            }
            else {
                strPArray.push(this.writeWithPromise(targetFilepath, result.tsResult));
            }
        });
    }
    writeWithPromise(filepath, content, sequence) {
        return new Promise((resolve, reject) => {
            FS.appendFileSync(filepath, content);
        });
    }
    /**
     * Remove all files in the given path recursively
     */
    rmdirSync(dir) {
        if (!FS.existsSync(dir)) {
            return;
        }
        let command = (require("os").type().match(/win\w*/i) ? 'rd /s /q ' : 'rm -r ') + `"${Path.normalize(dir)}"`;
        console.log(`[WARNING] ${command}`);
        require('child_process').execSync(`${command}`);
    }
    /**
     * Create directory or parent directory recursively if it does not exist.
     */
    mkdirSync(dir) {
        if (FS.existsSync(dir)) {
            return;
        }
        let parentDir = Path.dirname(dir);
        if (!FS.existsSync(parentDir)) {
            this.mkdirSync(parentDir);
        }
        
        FS.mkdirSync(dir);
    }
    entityToXML(entity) {
        return builder.buildObject(entity);
    } 

    mvn(filepath){
        console.log(`cd ${Path.dirname(filepath)}
@echo [INFO] 安装父pom工程（${filepath}）...
mvn clean install`)
        
    }
}
exports.FileHandler = FileHandler;
exports.fsHelper = new FileHandler();
//# sourceMappingURL=util.js.map