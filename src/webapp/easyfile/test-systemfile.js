const MSG_INFO = 'info';
const MSG_ERROR = 'error';
const MSG_WARN = 'warn';

// 防抖处理（300ms）
const debounce = (func, delay) => {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => func(...args), delay);
    };
  };

class TestFileSystemHandler{
    constructor(){
        this.id='filesystem';
        this.name="File";
        this.rootDirHandle;
        this.files = [];
        this.page = {};
        this.maxLine = 10000;
        this.closeFolder = [];
        this.fileService = new LPSFileService();
        this.enabledLog = true;
        this.base = 'C:/doc/work/pentaho_cvp7';
        this.data = ["apple", "banana", "cherry", "date", "elderberry", "fig", "grape"];
        this.dirHandleMap = new Map();
    }

    get isMobile(){
        return this.getSystemInfo().device.touchSupport;
    }

    create(){
        let body = `
        <div class="filehandler-header ${this.isMobile?'mobile':''}">
            <div class="filehandler-button-group">
                <button class="file-btn-start">start</button>
                <button class="file-btn-stop">stop</button>
            </div>
            <div class="filehandler-upload-group">
                <input type="file" id="folder-input" webkitdirectory directory multiple>
                <div id="file-list"></div>
            </div>
            <div class="autocomplete">
                <input type="text" id="searchInput" placeholder="enter search key..." autocomplete="off">
                <!-- 新增搜索图标 -->
                <svg class="search-icon" viewBox="0 0 24 24" onclick="performSearch()">
                    <path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                </svg>
                <div id="suggestions"></div>
            </div>
            Root Folder:<input class="filehandler-rootfd" type="text" value="${this.base}"></input><br/>
            search:<input class="filehandler-key-input" type="text"></input><br/>
            include:<input class="filehandler-include-input" type="text"></input><br/>
            exclude:<input class="filehandler-exclude-input" type="text" value=".git"></input><br/>
            <div class="filehandler-containers fa">
                <span class="file-total">${this.page.filteredTotal||0}</span>
                <ul class="filehanlder-root display-flex"></ul>
                <div class="filehandler-menu">
                    <div class="filehandler-menu-item" name="preview">Preview</div>
                    <div class="filehandler-menu-item" name="download">Download</div>
                    <div class="filehandler-menu-item" name="upload">Upload</div>
                    <div class="filehandler-menu-item" name="clear">Clear</div>
                    <div class="filehandler-menu-item" name="log">Enable Log</div>
                </div>
                <div class="filehandler-content-containers" style="white-space: pre;">
                    <div class="filehandler-content-title"></div>
                    <div class="filehandler-content-preview"></div>
                </div>
            </div>
        </div>
        `;
        $('#part-'+this.id).html(body);
        this.addLisenter();
        this.createFileListPart();
        
        //this.fileService.create($('.filehandler-containers'));
        this.showError('Not support test');
        this.showError('current os.name ' + this.getSystemInfo().os.name);
        this.showError('current browser.name ' + this.getSystemInfo().browser.name);
        this.showError('current device.type ' + this.getSystemInfo().device.type);
        this.showError('current touchSupport ' + this.getSystemInfo().device.touchSupport);
        if (this.isMobile){
            this.showError('Not support Android');
            this.retrevedFile();
            $('.filehandler-menu').addClass('mobile');
            // 加载文件列表
            async function loadFiles() {
                const res = await fetch('/sys/files');
                const files = await res.json();
                
                const list = files.map(file => 
                `<div>
                    ${file.name} (${file.size} bytes)
                    <button onclick="location.href='/download/${file.name}'">下载</button>
                </div>`
                ).join('');
                
                document.getElementById('fileList').innerHTML = list;
            }
        
            // 初始化加载
            loadFiles();
            this.showMenu();
        }
    }

    retrevedFile(){
        fetch('/file').then(response => {
        // fetch('/file').then(response => {
            return response.json();
        }).then(data => {
            console.log(data);
            this.showError('current /file ' + JSON.parse(data));
            this.files = JSON.parse(data).map(e=>{return {
                name:e.file,
                kind:e.isDirectory?'directory':'file',
                handle:()=>{},
                path:this.joinPaths(e.dir),
                level:1
            }});
            this.files.filter(e=>e.kind == 'directory').map(e => e.path).forEach(e=>this.closeFolder.push(e));
            this.sortFiles();
            this.createFileListPart();
        }).catch(e=>{
            this.showError('current /file error ' + e, 'error');
        });
    }

    joinPaths(...c){
        return c.filter(e=>e).join('/').replace(/\/+/g,'/').replace(/\\+/g,'/').replace(/\/$/,'');
    }

    retrevedSubFile(path){
        this.showError('current /file retrevedSubFile ' + path);
        let currentFile = this.files.find(e=>this.joinPaths(e.path, e.name) == path);
        if (!currentFile || currentFile.loaded == true){
            this.showError('current /file error ' + path);
            this.createFileListPart();
            return;
        }

        fetch('/file?path=' + path).then(response => {
        // fetch('/file').then(response => {
            return response.json();
        }).then(data => {
            console.log(data);
            let resultJONS = JSON.parse(data);
            if (resultJONS.error){
                this.showError('current /file/'+path+' ' + typeof resultJONS.error =='string' ?resultJONS.error : JSON.stringify(resultJONS.error));
                return; 
            }
            this.showError('current /file:'+path+' ' + data);
            this.showError('current /file:'+path+' ' + typeof resultJONS);
            let subFiles = resultJONS.map(e=>{return {
                name:e.file,
                kind:e.isDirectory?'directory':'file',
                handle:()=>{},
                path:this.joinPaths(e.dir),
                level:currentFile.level+1
            }});
            this.subFiles.filter(e=>e.kind == 'directory').map(e => e.path).forEach(e=>this.closeFolder.push(e));
            this.files.push(...subFiles);
            this.sortFiles();
            currentFile.loaded = true;
            this.createFileListPart();
        }).catch(e=>{
            e.stack && this.showError('current /file error ' + e.stack);
            this.showError('current /file error ' + e, 'error');
        });
    }

    sortFiles(){
        this.files.sort((a,b)=>{
            let pathA = this.joinPaths(a.path, a.name);
            let pathB = this.joinPaths(b.path, b.name);
            if (pathA == pathB){
                return 0;
            }
            if (pathA.indexOf(pathB) == 0){
                return 1;
            }
            else if (pathB.indexOf(pathA) == 0){
                return -1;
            }

            if (a.path == b.path){
                if (a.kind == 'directory' && b.kind == 'file'){
                    return -1;
                }else if (a.kind == 'file' && b.kind == 'directory'){
                    return 1;
                }
            }
            return pathA.toLocaleLowerCase().localeCompare(pathB.toLocaleLowerCase());
        });
    }

    showError(message, type, clear){
        message = this.formatDate(new Date(), 'yyyy-MM-dd hh:mm:ss') +'\t'+ message;
        console.log(message);
        if (!this.enabledLog){
            return;
        }
        let html = clear?'':$('.filehandler-content-preview').html() + '\n';
        if (type == MSG_ERROR){
            html += `<span style="color:red">${message}</span>`;
        }else if (type == MSG_INFO){
            html += `<span style="color:green">${message}</span>`;
        }else if (type == MSG_WARN){
            html += `<span style="background-color:yellow">${message}</span>`;
        }
        else{
            html += `<span>${message}</span>`;
        }
        $('.filehandler-content-preview').html(html);
    }

    addLisenter(){
        $('.file-btn-start').on('click', ()=>{
            this.isStop = false;
            this.getFile();
        })
        $('.file-btn-stop').on('click', ()=>{
            this.isStop = true;
        })
        $('.file-btn-save').on('click', ()=>{
            this.getNewFileHandle(this.getSaveContent());
        })
        $('.file-btn-import').on('click', ()=>{
            this.getFileByImport();
        })
        $('.file-btn-Test').on('click', ()=>{
            this.onmessage({data:'test data'});
        })

        $('.filehandler-key-input').on('change', ()=>{
            this.createFileListPart();
        })

        $('.filehandler-include-input').on('change', ()=>{
            this.createFileListPart();
        })
        $('.filehandler-exclude-input').on('change', ()=>{
            this.createFileListPart();
        })

        let mouseClickHandler = {
            mouseStartTime : 0,
            mouseEndTime : 0,
            mouseTarget : null
        }

        $('.filehandler-containers').on('click', '.filehanlder-file-item', (e)=>{
            $('li.filehanlder-file-item').removeClass('select');
            $(e.currentTarget).addClass('select');
            let name = $(e.currentTarget).attr('name');
            let path = $(e.currentTarget).attr('path');
            let kind = $(e.currentTarget).attr('kind');
            this.showError('click name ' + name, MSG_INFO);
            this.showError('click path ' + path, MSG_INFO);
            if (kind == 'directory'){
                let file = this.files.find(e=>e.path == path && e.name == name);
                if (!file.loaded){
                    this.dirHandle(path, name).then(()=>{
                        this.createFileListPart();
                    })
                }
                else if ($(e.currentTarget).is('.fa-caret-down')){
                    $(e.currentTarget).removeClass('fa-caret-down');
                    $(e.currentTarget).addClass('fa-caret-up');
                    this.closeFolder.push(this.joinPaths(path, name));
                    this.dirHandle(path, name);
                    if (this.isMobile){
                        //this.retrevedSubFile(this.joinPaths(path, name));
                    }else{
                    }
                    this.createFileListPart();
                }else if ($(e.currentTarget).is('.fa-caret-up')){
                    $(e.currentTarget).removeClass('fa-caret-up');
                    $(e.currentTarget).addClass('fa-caret-down');
                    let forderName = this.joinPaths(path, name);
                    this.closeFolder = this.closeFolder.filter(e => e!=forderName);
                    this.createFileListPart();
                }
            }
            if (kind == 'file'){
                //this.linkToPreview(name);
                if (this.isMobile){
                    mouseClickHandler.mouseTarget = e.currentTarget;
                    this.showMenu();
                }
            }else{
                if (this.isMobile){
                    this.hideMenu();
                }
            }
        })


        
        $('.filehandler-containers').on('mousedown', '.filehanlder-file-item', (e)=>{
            mouseClickHandler.mouseStartTime = new Date().getTime();
            mouseClickHandler.mouseTarget = e.currentTarget;
        })

        $('.filehandler-containers').on('mouseup', '.filehanlder-file-item', (e)=>{
            e.preventDefault();
            let currentTime = new Date().getTime();
            console.log(currentTime - mouseClickHandler.mouseStartTime);
            if (mouseClickHandler.mouseTarget == e.currentTarget && currentTime - mouseClickHandler.mouseStartTime > 400
                && currentTime - mouseClickHandler.mouseStartTime < 2000
            ){
                let name = $(e.currentTarget).attr('name');
                let kind = $(e.currentTarget).attr('kind');
                if (kind == 'file'){
                    this.showMenu(e);
                    mouseClickHandler.mouseEndTime = currentTime;
                }
            }
        })

        $('.filehandler-rootfd').on('change', (e)=>{
            this.isStop = false;
            this.getFile();
        })

        $('body').on('click', (e)=>{
            //console.log(e.target.closest('.filehandler-menu-item'));
            if (this.isMobile){
                return;
            }
            if ( e.target.closest('.filehandler-menu-item') == null && (mouseClickHandler.mouseEndTime && new Date().getTime() - mouseClickHandler.mouseEndTime > 5 || !mouseClickHandler.mouseEndTime)){
                this.hideMenu();
            }
        });


        $('.filehandler-menu').on('click', '.filehandler-menu-item', (e)=>{
            let name = $(e.currentTarget).attr('name');
            if (name == 'preview'){
                this.linkToPreview(mouseClickHandler.mouseTarget.getAttribute('path'), mouseClickHandler.mouseTarget.getAttribute('name'));
            }else if (name == 'download'){
                this.download(mouseClickHandler.mouseTarget.getAttribute('path'), mouseClickHandler.mouseTarget.getAttribute('name'));
            }else if (name == 'upload'){
                this.upload();
            }else if (name == 'clear'){
                this.showError('', MSG_INFO, true);
            }else if (name == 'log'){
                this.enabledLog = !this.enabledLog;
                e.currentTarget.innerHTML = this.enabledLog ? 'Disable Log' : 'Enable Log';
            }
            if (!this.isMobile){
                this.hideMenu();
            }
        })

        $('#folder-input').on('change', async (e) => {
            let folderInput = e.target;
            const items = folderInput.files;
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                this.showError('file name =' + item.name);
            }
            const fileTree = {};

            // 构建文件树结构
            for (let i = 0; i < items.length; i++) {
                const item = items[i];

                console.log(item.name);
                this.showError(item.name);

                const relativePath = item.webkitRelativePath;
                if (relativePath){
                    const pathParts = relativePath.split('/');
                    let currentLevel = fileTree;
                    for (let j = 0; j < pathParts.length; j++) {
                        const part = pathParts[j];
                        if (j === pathParts.length - 1) {
                            currentLevel[part] = item;
                        } else {
                            if (!currentLevel[part]) {
                                currentLevel[part] = {};
                            }
                            currentLevel = currentLevel[part];
                        }
                    }
                }else{
                    fileTree[item.name] = item;
                }
            }

            // 渲染文件树
            function renderTree(tree, parentElement) {
                for (const key in tree) {
                    const item = tree[key];
                    const listItem = document.createElement('li');
                    const link = document.createElement('a');
                    if (typeof item === 'object' && !(item instanceof File)) {
                        link.textContent = `[文件夹] ${key}`;
                        const subList = document.createElement('ul');
                        renderTree(item, subList);
                        listItem.appendChild(link);
                        listItem.appendChild(subList);
                    } else {
                        link.textContent = key;
                        link.href = URL.createObjectURL(item);
                        link.download = item.name;
                        listItem.appendChild(link);
                    }
                    parentElement.appendChild(listItem);
                }
            }

            let fileList = document.getElementById('file-list');

            fileList.innerHTML = '';
            const rootList = document.createElement('ul');
            renderTree(fileTree, rootList);
            fileList.appendChild(rootList);
        })

        this.addSuggrestionListener();
    }

    addSuggrestionListener(){
        // $('#searchInput').on('input', async (e)=> {
        //     const input = $(e.target).val().toLowerCase();
        //     const filtered = (await this.getSearchInputSuggestions()).filter(item => 
        //       item.toLowerCase().includes(input)
        //     );
            
        //     const suggestions = $('#suggestions');
        //     suggestions.empty();
            
        //     if (input.length > 0 && filtered.length > 0) {
        //       filtered.forEach(item => {
        //         $('<div>').addClass('suggestion-item')
        //           .text(item)
        //           .click(() => {
        //             $('#searchInput').val(item);
        //             suggestions.hide();
        //           })
        //           .appendTo(suggestions);
        //       });
        //       suggestions.show();
        //     } else {
        //       suggestions.hide();
        //     }
        //   });

          // 输入处理（带异步支持）
            $('#searchInput').on('input', debounce(async (e)=> {
                const input = $(e.target).val().trim();
                $('#suggestions').html('<div class="loading">加载中...</div>').addClass('show');
                
                try {
                    let suggestionsData = await this.getSearchInputSuggestions();
                    $('#suggestions').empty();
                    
                    if (input && suggestionsData.length) {
                        suggestionsData.forEach(item => {
                        $('<div>').addClass('suggestion-item')
                            .html(this.highlightText(item, input))
                            .click(() => {
                                $('#searchInput').val(item.value);
                                $('#suggestions').removeClass('show');
                            })
                            .appendTo('#suggestions');
                        });
                        $('#suggestions').addClass('show');
                    } else {
                        $('#suggestions').removeClass('show');
                    }
                } catch(e) {
                    this.showError(e.stack, MSG_ERROR);
                    $('#suggestions').html('<div class="error">加载失败</div>');
                }
            }, 300));
          
          // 点击页面其他区域关闭提示
          $(document).on('click', e => {
            if (!$(e.target).closest('.autocomplete').length) {
              //$('#suggestions').hide();
            }
          });


          // 键盘导航
        let currentIndex = -1;
        $('#searchInput').on('keydown', e => {
            const items = $('#suggestions .suggestion-item');
            if (e.key === 'ArrowDown') {
                currentIndex = (currentIndex + 1) % items.length;
            } else if (e.key === 'ArrowUp') {
                currentIndex = (currentIndex - 1 + items.length) % items.length;
            } else if (e.key === 'Enter') {
                if (currentIndex > -1) {
                    $('#searchInput').val(suggestionsData[currentIndex]);
                    $('#suggestions').removeClass('show');
                }
                return;
            } else return;
        
            items.removeClass('active');
            items.eq(currentIndex).addClass('active').get(0)?.scrollIntoView({ block: 'nearest' });
        });


        // 新增搜索函数
        function performSearch() {
            const keyword = $('#searchInput').val().trim();
            if (keyword) {
            // 执行搜索逻辑，示例用alert展示
            alert('执行搜索: ' + keyword);
            // 实际应调用搜索接口或执行过滤
            }
        }
        
        // 绑定回车键事件
        $('#searchInput').on('keypress', e => {
            if (e.which === 13) this.performSearch();
        });
    }

    performSearch() {
        const keyword = $('#searchInput').val().trim();
        if (keyword) {
            // 执行搜索逻辑，示例用alert展示
            //alert('执行搜索: ' + keyword);
            $('.filehandler-rootfd').val(keyword);
            this.getFile();
            // 实际应调用搜索接口或执行过滤
        }
    }

    // 高亮匹配文字
    highlightText(item, input){
        const regex = new RegExp(`(${input})`, 'gi');
        return this.kindText(item, item.value.replace(regex, '<span class="highlight">$1</span>'));
    }

    // 增加类型标识
    kindText(item, input){
        if (item.kind == 'directory'){
            return '<span class="dir-icon"></span>' + input;
        }else{
            return '<span class="file-icon"></span>' + input;
        }
    }

    async getSearchInputSuggestions(){
        const input = $('#searchInput').val().toLowerCase();
        if (input.match(/\/$/)){

            let currentPath = input;
            let file = this.files.find(e=>this.joinPaths(e.path, e.name).toLowerCase() == input);
            if (!file){
                if (this.dirHandleMap.has(currentPath)){
                    file = this.dirHandleMap.get(currentPath);
                }else{
                    file = {handle:this.createSystemDirectoryHandle(currentPath)};
                    this.dirHandleMap.set(currentPath, file);
                }
            }
            let suggestions = [];
            let entries = await file.handle.entries();
            for(const [key, value] of entries) {
                console.log({ key, value });
                suggestions.push({kind: value.kind, value: this.joinPaths(currentPath, key), label: key});
            }
            return suggestions;

        }else{
            // get parent path
            let currentPath = input.split('/');
            let fileName = currentPath.pop();
            currentPath = currentPath.join('/');
            let file = this.files.find(e=>this.joinPaths(e.path, e.name).toLowerCase() == currentPath);
            if (!file){
                if (this.dirHandleMap.has(currentPath)){
                    file = this.dirHandleMap.get(currentPath);
                }else{
                    file = {handle:this.createSystemDirectoryHandle(currentPath)};
                    this.dirHandleMap.set(currentPath, file);
                }
            }
            
            let suggestions = [];
            let entries = await file.handle.entries();
            entries = entries || new Map();
            for(const [key, value] of entries) {
                console.log({ key, value });
                if (key.toLowerCase().indexOf(fileName) == 0){
                    suggestions.push({kind: value.kind, value: this.joinPaths(currentPath, key), label: key});
                }
            }
            return suggestions;
        }
    }

    async upload(){
        const files = document.getElementById('folder-input').files;
        if (!files || !files.length) {
            return;
        }
        const formData = new FormData();
        
        // 添加所有文件到FormData
        Array.from(files).forEach(file => {
            formData.append('files', file);  // 字段名改为复数
        });

        this.showError('start upload size='+files.length, 'info');
        await fetch('/upload', { method: 'POST', body: formData }).then(response => {
            this.showError('upload sucecss', 'info');
            return response.json();
        }).then(data => {
            this.showError('upload sucecss - '+data.length+' ' + JSON.stringify(data), 'info');
            console.log(data);
        }).catch(e=>{
            e.stack && this.showError('current /file error ' + e.stack);
            this.showError('current /file error ' + e, 'error');
            console.log(e);
        });
        //loadFiles();
    }

    download(path, name){
        this.showError('download ' + path + ' ' + name);
        if (!this.isMobile){
            this.showError('Not support download');
            return;
        }

        this.showError('start download file'+ this.joinPaths(path, name), 'info');
        this.find(path, name).handle.download().then(file => {
            const url = URL.createObjectURL(file);
            const a = document.createElement('a');
            a.href = url;
            a.download = name;
            a.click();
            URL.revokeObjectURL(url);
        });
    }

    find(path, name){
        return this.files.find(e=>e.path == path && e.name == name);
    }

    hideMenu(){
        $('.filehandler-menu').hide();
    }

    showMenu(e){
        if (!this.isMobile){
            $('.filehandler-menu').css('top', `${e.clientY}px`);
            $('.filehandler-menu').css('left', `${e.clientX}px`);
        }
        $('.filehandler-menu').show();
    }

    async linkToPreview(path, name){
        if (/.*\.(txt|log|rm|bat|log|html|java|c|css|js|json|sh)$/ig.test(name)){
            let selectedFile = this.find(path, name);
            if (!selectedFile || !selectedFile.handle.getFile){
                return;
            }
            let fileData = await selectedFile.handle.getFile();
            if (fileData){
                const reader = new FileReader();
                reader.addEventListener(
                    "load",
                    () => {
                        // 然后这将显示一个文本文件
                        this.updatePreviewText(reader.result, name);
                    },
                    false,
                );
    
                if (fileData) {
                    reader.readAsText(fileData);
                }
            }
        }
    }

    updatePreviewText(fileData, title){

        $('.filehandler-content-title').html(title || '');
        $('.filehandler-content-preview').text(`<pre>${fileData}</pre>`);
    }
    updatePreviewImage(fileData, title){
        $('.filehandler-content-title').html(title || '');
        $('.filehandler-content-preview').html(`<img src="${fileData}"/>`);
    }

    getSaveContent(fileData){
        return JSON.stringify(this.files||[]);
    }

    createSystemDirectoryHandle(rootFolder){
        let rootPath = rootFolder.split(/\/|\\/).filter(e=>e);
        let rootName = rootPath.pop();
        let rootDir = rootPath.join('/');
        let handler = new MyFileSystemDirectoryHandle();
        handler.path = rootDir;
        handler.name = rootName;
        handler.kind = 'directory';
        return handler;
    }

    // 存放对文件句柄的引用
    async  getFile() {
        let showDirectoryPicker = window.showDirectoryPicker;
        this.showError('start get file', MSG_INFO);
        if (showDirectoryPicker === undefined){
            this.showError('Not support showDirectoryPicker', MSG_WARN);
            let rootFolder = $('.filehandler-rootfd').val() || 'C:/doc/work/pentaho_cvp7';
            let rootPath = rootFolder.split(/\/|\\/).filter(e=>e);
            let rootName = rootPath.pop();
            let rootDir = rootPath.join('/');
            showDirectoryPicker =  async ()=>{
                let handler = new MyFileSystemDirectoryHandle();
                handler.path = this.joinPaths(rootDir);
                handler.name = rootName;
                handler.kind = 'directory';
                return handler
            };
        }
        // 打开文件选择器
         showDirectoryPicker().then(fileHandle =>{
            this.rootDirHandle = fileHandle;
            this.files = [];
            console.time('files');
            if (fileHandle.kind === "file") {
                // 运行针对文件的代码
            } else if (fileHandle.kind === "directory") {
                // 运行针对目录的代码
                this.addInHandler(null, fileHandle);
                this.listDir(fileHandle);
            }
            this.createFileListPart();
            this.showError('end get file', 'info');
        }).catch(e=>{

            this.showError('getFile error', 'error');
            this.showError(e.stack, 'error');
        });

    }

    getFileByImport(){
        const pickerOpts = {
            startIn:"documents",
            types: [
                {
                description: "Text file",
                accept: { "text/plain": [".txt", ".json"] },
                },
            ],
            excludeAcceptAllOption: true,
            multiple: false,
          };
        
          // 打开文件选择器
        window.showOpenFilePicker(pickerOpts).then(async fileHandle =>{
            this.files = [];
            console.time('import');
            // 获取文件内容
            const fileData = await fileHandle[0].getFile();
            const reader = new FileReader();
            reader.addEventListener(
                "load",
                () => {
                    // 然后这将显示一个文本文件
                    this.files = JSON.parse(reader.result);
                    this.createFileListPart();
                },
                false,
            );

            if (fileData) {
                reader.readAsText(fileData);
            }
        });
          
        return null;
    }

    async getNewFileHandle(contents) {
        const opts = {
          startIn:"documents",
          types: [
            {
              description: "Text file",
              accept: { "text/plain": [".txt", ".json"] },
            },
          ]
        };
        window.showSaveFilePicker(opts).then(async fileHandle=>{
            this.writeFile(fileHandle, contents);
        });
    }

    async writeFile(fileHandle, contents) {
        // 创建一个 FileSystemWritableFileStream 用来写入。
        const writable = await fileHandle.createWritable();
      
        // 将文件内容写入到流中。
        await writable.write(contents);
      
        // 关闭文件并将内容写入磁盘。
        await writable.close();
    }

    async dirHandle(path, name) {
        let file = this.files.find(e=>this.joinPaths(e.path, e.name) == this.joinPaths(path, name));
        if (file.loaded){
            return;
        }
        await this.listDir(file.handle);
    }

    /**
     * 
     * @param {FileSystemDirectoryHandle } currentDirHandle 
     */
    async listDir(currentDirHandle){
        if (this.isStop){
            return;
        }

        if (currentDirHandle.custom){
            let entries = await currentDirHandle.entries();
            for(const [key, value] of entries) {
                console.log({ key, value });
                this.addInHandler(currentDirHandle, value);
                if (value.kind === "file") {
                    // 运行针对文件的代码
                } else if (value.kind === "directory") {
                    // 运行针对目录的代码
                    //await this.listDir(value);
                }
            }
        }else{
            for await (const [key, value] of currentDirHandle.entries()) {
                console.log({ key, value });
                this.addInHandler(currentDirHandle, value);
                if (value.kind === "file") {
                    // 运行针对文件的代码
                } else if (value.kind === "directory") {
                    // 运行针对目录的代码
                    await this.listDir(value);
                }
            }
        }

        this.files.find(e=>e.handle==currentDirHandle).loaded = true;
    }


    addInHandler(dirHandler, currentFileHandler){
        let newH = {name:currentFileHandler.name, kind:currentFileHandler.kind, path:''};
        newH.handle = currentFileHandler;
        if (dirHandler) {
            let sfile = this.files.find(t => t.handle == dirHandler);
            if (sfile){
                newH.path = this.joinPaths(sfile.path, sfile.name);
            }else{
                newH.path = this.joinPaths(dirHandler.path, dirHandler.name);
            }
        }else{
            newH.path = this.joinPaths(currentFileHandler.path);
        }

        let rootLevel = this.rootDirHandle.path.split('/').length;
        newH.level = newH.path.split('/').length - rootLevel;
        this.files.push(newH);
       
        $('.file-total').html(`total:<b>${this.files.length}</b>`)
    }

    count(){
        this.page.filteredTotal = this._filteredResult.length;
        return this;
    }

    values(){
        return this._filteredResult;
    }

    sort(){
         this._filteredResult.sort((a,b)=>{
            if (a.path == b.path){
                return a.name.toString().localeCompare(b.name.toString().toLocaleLowerCase());
            }else {
                let pathArray = a.path.split('/');
                pathArray.push(a.name);
                let pathBArray = b.path.split('/');
                pathBArray.push(b.name);
                for (let i = 0; i < Math.min(pathArray.length, pathBArray.length); i++){
                    if (pathArray[i] != pathBArray[i]){
                        return pathArray[i].toLocaleLowerCase().localeCompare(pathBArray[i].toLocaleLowerCase());
                    }
                }
                return pathArray.length - pathBArray.length;
            }
        });
        return this;
    }

    input(filteredResult){
        this._filteredResult = filteredResult;
        return this;
    }

    inputFiltered(){
        return this.filteredByCloseFolder().filteredExclude().filteredInclude().filteredSeachkey();
    }

    filteredByCloseFolder(){
        if (!this.closeFolder.length){
            return this;
        }
        this._filteredResult = this._filteredResult.filter(item=>{
            for (let word of this.closeFolder){
                if (this.isSubPath(this.joinPaths(word), this.joinPaths(item.path))){
                    return false;
                }
            }
            return true;
        });

        return this;
    }

    isSubPath(parentPath, subpath){
        return subpath.indexOf(parentPath) == 0;
    }

    filteredExclude(){
        let incldue = $('.filehandler-exclude-input').val();
        if (!incldue){
            return this;
        }
        let words = incldue.toLocaleLowerCase().split(';');
        this._filteredResult = this._filteredResult.filter(item=>{
            for (let word of words){
                if (item.path.toLocaleLowerCase().indexOf(word) != -1 || item.name.toLocaleLowerCase().indexOf(word) != -1){
                    return false;
                }
            }
            return true;
        });
        return this;
    }

    filteredInclude(){
        let incldue = $('.filehandler-include-input').val();
        if (!incldue){
            return this;
        }
        let words = incldue.toLocaleLowerCase().split(';');
        this._filteredResult = this._filteredResult.filter(item=>{
            for (let word of words){
                if (item.path.toLocaleLowerCase().indexOf(word) != -1){
                    return true;
                }
            }
            return false;
        });
        return this;
    }

    filteredSeachkey(){
        let incldue = $('.filehandler-key-input').val().toLocaleLowerCase();
        if (!incldue){
            return this;
        }
        this._filteredResult = this._filteredResult.filter(item=>{
            return item.path.toLocaleLowerCase().indexOf(incldue) != -1 || item.name.toLocaleLowerCase().indexOf(incldue) != -1;
        });
        return this;
    }

    getFileItem(f){
        !f.lastModifiedDate && this.getLastmodifiedDate(f);
        //this.showError(JSON.stringify(f));
        return `<li class="flex-item-full filehanlder-file-item ${this.isCatetDown(f)}" name="${f.name}" kind="${f.kind}" path="${f.path}" level="${f.level}">${f.name || f.path}<span class="time-label">${f.lastModifiedDate&&this.formatDate(f.lastModifiedDate, 'yyyy-MM-dd hh:mm:ss')||''}</span> <span class="size-label">${this.sizeLabel(f)}</span></li>`;
    }

    sizeLabel(f){
        let size = f.handle?.size||0;
        if (size > 1024*1024*1024){
            return `${(size/1024/1024/1024).toFixed(2)} GB`;
        }else if (size > 1024*1024){
            return `${(size/1024/1024).toFixed(2)} MB`;
        }else if (size > 1024){
            return `${(size/1024).toFixed(2)} KB`;
        }else{
            return `${size} B`;
        }
    }

    /**
     * + => fa-caret-up
     * - => fa-caret-down
     * @param {*} f 
     * @returns 
     */

    isCatetDown(f){
        let path = this.joinPaths(f.path, f.name);
        if (f.kind == 'directory'){
            if (f.loaded){
                if (this.closeFolder.indexOf(path) == -1){
                    return 'fa-caret-down';
                }else{
                    return 'fa-caret-up';
                }
            }else{
                return 'fa-caret-up';
            }    

        }

        return f.kind=='directory'? !f.loaded?'fa-caret-up': (this.closeFolder.indexOf(path) == -1?'fa-caret-down':'fa-caret-up'):'';
    }

    async getLastmodifiedDate(f){
        if (f.kind == 'file' && f.handle.getFile && !f.handle.custom){
            let fileData = await f.handle.getFile();
            f.lastModifiedDate = fileData.lastModifiedDate;
            //fileData.lastModifiedDate.getTime();
            $(`li[name="${f.path||f.name}"] .time-label`).text(this.formatDate(fileData.lastModifiedDate, 'yyyy-MM-dd hh:mm:ss'));
        }
    }

    createFileListPart(){
        let content = this.input(this.files).inputFiltered().count().sort().values().map((f, index) =>{
            if (index > this.maxLine)return '';
            return this.getFileItem(f);
        })
        $('.filehandler-containers file-total').html(`${this.page.filteredTotal||0}`);
        $('.filehanlder-root').html(content.join(''));
    }

     formatDate (inputDate, format)  {
        if (!inputDate) return '';
        if(typeof inputDate === 'string'){
            inputDate = new Date(Date.parse("2021-01-25T09:46:17.346Z"));
            
        }
    
        const padZero = (value) => (value < 10 ? `0${value}` : `${value}`);
        const parts = {
            yyyy: inputDate.getFullYear(),
            MM: padZero(inputDate.getMonth() + 1),
            dd: padZero(inputDate.getDate()),
            HH: padZero(inputDate.getHours()),
            hh: padZero(inputDate.getHours() > 12 ? inputDate.getHours() - 12 : inputDate.getHours()),
            mm: padZero(inputDate.getMinutes()),
            ss: padZero(inputDate.getSeconds()),
            tt: inputDate.getHours() < 12 ? 'AM' : 'PM'
        };
    
        return format.replace(/yyyy|MM|dd|HH|hh|mm|ss|tt/g, (match) => parts[match]);
    }

    async onmessage(e){
        // 从主线程检索发送到 worker 的消息
        const message = e.data;
      
        // 获取草稿文件的句柄
        navigator.storage.getDirectory().then(async root =>{
            const draftHandle = await root.getFileHandle("draft.txt", { create: true });
            // 获取同步访问句柄
            const accessHandle = await draftHandle.createSyncAccessHandle();
          
            // 获取文件的大小
            const fileSize = accessHandle.getSize();
            // 将文件内容读取到缓冲区
            const buffer = new DataView(new ArrayBuffer(fileSize));
            const readBuffer = accessHandle.read(buffer, { at: 0 });
          
            // 将消息写入文件末尾
            const encoder = new TextEncoder();
            const encodedMessage = encoder.encode(message);
            const writeBuffer = accessHandle.write(encodedMessage, { at: readBuffer });
          
            // 将更改保存到磁盘
            accessHandle.flush();
          
            // 如果完成，请始终关闭 FileSystemSyncAccessHandle
            accessHandle.close();
        });
    }

    getSystemInfo() {
        return {
          // 操作系统信息
          os: {
            name: (() => {
              const ua = navigator.userAgent;
              if (/Windows/.test(ua)) return "Windows";
              if (/Macintosh/.test(ua)) return "MacOS";
              if (/Linux/.test(ua)) return "Linux";
              if (/Android/.test(ua)) return "Android";
              if (/iOS|iPhone|iPad/.test(ua)) return "iOS";
              return "Unknown";
            })(),
            version: navigator.platform
          },
      
          // 浏览器信息
          browser: {
            name: navigator.userAgent.match(/(Chrome|Firefox|Safari|Edge|Opera|IE)\//)?.[1] || 'Unknown',
            version: navigator.appVersion,
            userAgent: navigator.userAgent,
            language: navigator.language
          },
      
          // 屏幕信息
          screen: {
            resolution: `${screen.width}x${screen.height}`,
            available: `${window.innerWidth}x${window.innerHeight}`,
            colorDepth: screen.colorDepth + 'bit'
          },
      
          // 设备信息
          device: {
            type: /Mobi/.test(navigator.userAgent) ? 'Mobile' : 'Desktop',
            touchSupport: 'ontouchstart' in window
          },
      
          // 其他信息
          gpu: navigator.gpu?.getPreferredCanvasFormat?.() ? 'WebGPU Supported' : 'Unknown',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };
    }
      
}

class LPSFileService{
    constructor(){
        this.allFiles = [];
        this.loadding = false;
    }

    create(container){

        let URLPaser = URL.parse(location.href);

        if (URLPaser.origin == 'file://'){
            return;
        }

        let body = `<style>
	[type="folder"]>.filelabel{
        background-color: chocolate;
    }
	.searchresult li{
		font-family: "SF Pro SC","SF Pro Text","SF Pro Icons","PingFang SC", Verdana, Arial, '微软雅黑','宋体';
		font-size: 14px;
		width: max-content;
		
	}
	.resultdetail{
		width: max-content;
		display:flex;
		flex-wrap: wrap;
	}
	.fileicon{
		width:20px;
		cursor: pointer;
	}
    .file-ul{
    width:100%;
    }
</style>
	
<p class="filesearchp">
	Object Search
</p>
<p class="btn-container">
	Fields Search: <input class="search" id="file-search-input" type="input" value="" ></input><br/>
    Base Folder: <input class="search" id="file-base-path-input" type="input" value="C:/doc/doc" ></input>
</p>

<div class="filesearchresult btn-container display-flex">
	<div class="flex-item-full">
        <div class="totalbar btn"><span>Total Records : </span><span class="recordsnumber">0</span><div class="dot"/></div>
    </div>
	
	<div class="fileobjsearchresult flex-item--1-3"></div>
	<div class="filedetailearchresult" style="white-space: pre;"></div>
</div>`
        container.append(body);
        this.init();
        this.addLisenter();

        const ob = new IntersectionObserver((entries)=>{
            console.log('交叉改变后运行');
            for (let entry of entries){
                if (entry.isIntersecting){
                    console.log('交叉');
                    let item = entry.target;
                    ob.unobserve(item);
                }
            }
        }, {
            threshold:0
        })

        let items = document.querySelectorAll('.fileitem');
        items.forEach(item =>{
            ob.observe(item);
        })
    }

    init(){
        this.getFiles();
        this.loaddingMap= {};
    }

    addLisenter(){
        $('.filesearchresult').on('click','li.fileitem' ,(e)=>{
            let fileId = $(e.currentTarget).attr('fid');

            let clickedFile = this.allFiles.find(file =>file.id==fileId);
            if(clickedFile){
                if (clickedFile.open == '+'){
                    this.getFiles(fileId, e.currentTarget);
                    clickedFile.open = '-';
                }else if (clickedFile.open == '-'){
                    this.closeFiles(fileId);
                    clickedFile.open = '+';
                }
                $(`li[fid="${fileId}"]>.fileicon`).text(clickedFile.open);

                this.linkToPreview(clickedFile.isTree?clickedFile.dir + '\\' + clickedFile.file:clickedFile.file);
            }
            e.stopPropagation();
        })

        $('#file-search-input').on('change', ()=>{
            
            this.searchFiles($('#file-search-input').val());
        })
    }

    renderfiletree(files, root){
        root = root || $('.fileobjsearchresult')[0];
        if ($(root).is('.fileobjsearchresult')){
            $(`.fileobjsearchresult>.file-ul`).remove();
        }
        let selectedText = '';
        let result = files.map(t => `<li class="level${t.level} fileitem resultdetail ${selectedText&&(selectedText==t.file) ?'selecteditem':''}" type="${t.isDirectory?'folder':'file'}" value="${t.file}" fid="${t.id}">
            <span class="fileicon">${t.open}</span><span class="filelabel">${t.file}</span>
        </li>`).join('');
        $(root).append(`<ul class="file-ul">${result}</ul>`);
    }

    renderSearchFiletree(files, root){
        root = root || $('.fileobjsearchresult')[0];
        $(`.fileobjsearchresult>.file-ul`).remove();
        $('.recordsnumber').text(files.length);
        let selectedText = '';
        let result = files.map(t => `<li class="level${t.level} fileitem resultdetail ${selectedText&&(selectedText==t.file) ?'selecteditem':''}" type="${t.isDirectory?'folder':'file'}" value="${t.file}" fid="${t.id}">
            <span class="fileicon">${t.open}</span><span class="filelabel">${t.file}</span>
        </li>`).join('');
        $(root).append(`<ul class="file-ul">${result}</ul>`);
    }

    appendRenderSearchFiletree(files, root){
        //$(`.fileobjsearchresult>.file-ul`).remove();
        let selectedText = '';
        let exitsMapPath = {};
        root = root || $('.fileobjsearchresult')[0];
        $(root).find('.file-ul>li').each((index, ele)=>{
            let path = $(ele).attr('value');
            if (path){
                exitsMapPath[path]=true;
            }
        })
        let result = files.filter(e=>{
            return !exitsMapPath[e.file];
        }).map(t => `<li class="level${t.level} fileitem resultdetail ${selectedText&&(selectedText==t.file) ?'selecteditem':''}" type="${t.isDirectory?'folder':'file'}" value="${t.file}" fid="${t.id}">
        <span class="fileicon">${t.open}</span><span class="filelabel">${t.file}</span>
        </li>`).join('');
        $(root).find('.file-ul').append(`${result}`);
        $('.recordsnumber').text($(root).find('.file-ul>.fileitem').length);
    }

    closeFiles(fileId){
        $(`li[fid="${fileId}"] .file-ul`).remove();
    }

    async linkToPreview(filePath){
        this.loadFile(filePath);
    }

    updatePreviewText(fileData, title){
        $('.filedetailearchresult').text(`${fileData}`);
    }
    updatePreviewImage(url, title){
        $('.filedetailearchresult').html(`<img style="width: auto;" src="${url}"/>`);
    }

    

    getFilesFromCache(fid){
        let currentFile = this.allFiles.find(e => e.id==fid);
        let children = []
    }

    set showSpinner(flag){
        this._showSpinner = flag;
        if (flag){
            $('.totalbar').addClass('loading');
        }else{
            $('.totalbar').removeClass('loading');
        }
    }

    get showSpinner(){
        return this._showSpinner;
    }

    loadFile(filePath){
        let data = {path: filePath};
        fetch(encodeURI(this.getBaseUrl() +'api/loadfile'),{
            method: "POST", // *GET, POST, PUT, DELETE, etc.
            mode: "cors", // no-cors, *cors, same-origin
            cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
            credentials: "same-origin", // include, *same-origin, omit
            headers: {
              "Content-Type": "application/json",
              // 'Content-Type': 'application/x-www-form-urlencoded',
            },
            redirect: "follow", // manual, *follow, error
            referrerPolicy: "no-referrer", // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
            body: JSON.stringify(data), // body data type must match "Content-Type" header
          }).then((response) => response.blob())
          .then((blob) => {
            if (/image\/.*/ig.test(blob.type)){
                 return this.updatePreviewImage(URL.createObjectURL(blob), filePath.split('/').pop());
            } else if (/text\/.*/ig.test(blob.type)){
                return blob.text().then(e=>{
                    this.updatePreviewText(e, filePath.split('/').pop());
                })
            }
          })
          .then((url) => {
            
          })
          .catch((err) => console.error(err))
    }

    searchFiles(keyword){
        if (!keyword){
            this.getFiles();
            return;
        }
        let path = $('#file-base-path-input').val();
        let data = {searchKey:keyword, base:path, lastRecordId:this.lastRecordId, rquestId:Date.now()};

        this.loaddingMap.searchFiles = true;
        this.showSpinner = true
        fetch(encodeURI(this.getBaseUrl() +'api/search'),{
            method: "POST", // *GET, POST, PUT, DELETE, etc.
            mode: "cors", // no-cors, *cors, same-origin
            cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
            credentials: "same-origin", // include, *same-origin, omit
            headers: {
              "Content-Type": "application/json",
              // 'Content-Type': 'application/x-www-form-urlencoded',
            },
            redirect: "follow", // manual, *follow, error
            referrerPolicy: "no-referrer", // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
            body: JSON.stringify(data), // body data type must match "Content-Type" header
          }).then((response) =>{
            
            return response.json();
          })
          .then((myJson)=> {
                try{
                    let filelistobj = null;
                    if (typeof myJson == 'string'){
                        filelistobj = JSON.parse(myJson);
                    }else{
                        filelistobj=myJson;
                    }
                    console.log('xxxsearch', filelistobj);
                    for(let file of filelistobj.datas||[]){
                        file.isDirectory = false;
                        file.file = file.path;
                        file.open = '';
                        file.id = file.ino;
                        file.level = 0;
                    }
                   
                    
                    if (!filelistobj.done){
                        this.allFiles.push(...filelistobj.datas);
                        this.appendRenderSearchFiletree(filelistobj.datas, null);
                        this.lastRecordId = filelistobj.lastRecordId
                        setTimeout(this.searchFiles(keyword), 1000);
                    }else{
                        this.allFiles = filelistobj.datas;
                        this.renderSearchFiletree(filelistobj.datas, null);
                        this.lastRecordId = null;
                    }
                }catch(e){
                    console.log('exceptiopn', e);
                }finally{
                    this.showSpinner = false;
                }
          }).finally(e=>{
            this.loaddingMap.searchFiles = false;
          });
    }

    getFiles(openfile){
        if (this.loadding){
            console.log('waiting...');
            return;
        }
        
        let allFiles = this.allFiles;
        openfile = openfile||'-1';
        let clickedFile = allFiles.find(file =>file.id==openfile);
        clickedFile = clickedFile || {file:'',id:-1, pid:-1, level:-1, isDirectory:true, open:'+', state: 'pending'};
        
        
        if (!clickedFile.isDirectory || clickedFile.open=='-'){
            console.log('no need open waiting...');
            return;
        }
        if (clickedFile.state == 'ready'){
            let subFiles = allFiles.filter(e => e.folder == clickedFile);
            let dir = $(`[fid="${clickedFile.id}"]`);
            this.renderfiletree(subFiles,dir.length?dir[0]:null);
            console.log('xxx', allFiles);
            clickedFile.open='-';
        }else{
            let fileNameList = [clickedFile.file];
            let pfile = clickedFile;
            while(pfile.pid != -1){
                pfile = pfile.folder;
                if (null == pfile){
                    break;
                }
                fileNameList.push(pfile.file);
            }

            this.loadding = true;
            fetch(encodeURI(this.getBaseUrl()+'file/' + fileNameList.reverse().join('/'))).then((response) =>{
                return response.json();
              })
              .then((myJson)=> {
                    try{
                        let filelistobj = JSON.parse(myJson);
                        let oldLength = allFiles.length;
                        allFiles.push(...filelistobj);
                        let newId = 1;
                        for (let f of filelistobj){
                            f.id = f.id || (clickedFile.id + '-' + newId++);
                            f.pid = f.pid || clickedFile.id;
                            f.level = f.level || (clickedFile.level +1);
                            f.open = f.isDirectory?'+':'';
                            f.folder = clickedFile;
                            f.state = 'pending';
                            f.isTree = true;
                            clickedFile.state = 'ready';
                        }
                        let dir = $(`[fid="${clickedFile.id}"]`);
                        filelistobj.sort((a, b)=>{
                            return a.isDirectory != b.isDirectory?a.isDirectory - b.isDirectory : a.file.toLocaleLowerCase().localeCompare(b.file.toLocaleLowerCase())
                        })
                        this.renderfiletree(filelistobj, dir.length?dir[0]:null);
                        console.log('xxx', allFiles);
                        clickedFile.open='-';
                    }catch(e){
                        
                    }finally{
                        this.loadding = false;

                    }
              });
        }
    }

    getBaseUrl(){
        return window.location.host + '/';
    }

}

class MyFileSystemDirectoryHandle {
    constructor(){
        this._entries = new Map();
        this.name = '';
        this.kind = 'directory';
        this.path = '';
        this.custom= true;
        this._entry = null;
        this.files = [];
        this.__loading = true;
    }
    joinPaths(...c){
        return c.filter(e => e).join('/').replace(/\/+/g,'/').replace(/\\+/g,'/').replace(/\/$/,'');
    }

    get size(){
        if (this.kind == 'directory' && this._entries){
            let size = 0;
            for (let [key, value] of this._entries){
                size += value.size;
            }
            return size;
        }
        return this._entry?this._entry.size : this.files?this.files.reduce((k, t)=>k+t.size,0):0;
    }
    
    entries(){
        if (!this.__loading){
            return Promise.resolve(this._entries);
        }
        return fetch('/file?path=' + this.joinPaths(this.path, this.name)).then(response => {
            return response.json();
        }).then(data => {
            console.log(data);
            this.__loading = false;
            let resultJONS = JSON.parse(data);
            if (resultJONS.error){
                return [];
            }

            let inentries = new Map();
            this.files = resultJONS;
            resultJONS.forEach(e=>{
                let childHanlder = new MyFileSystemDirectoryHandle();
                childHanlder.path = this.joinPaths(this.path, this.name);
                childHanlder.name = e.file;
                childHanlder.kind = e.isDirectory?'directory':'file';
                childHanlder._entry = e;
                //inentries.push({name:e.file, kind:e.isDirectory?'directory':'file', handle:childHanlder});
                inentries.set(e.file, childHanlder);
            });
            this._entries = inentries;
            return this._entries;
        }).catch(e=>{
            console.log('entries error', e);
        });
    }

    getFile(){
        return fetch('/filecontent?path=' + this.joinPaths(this.path, this.name)).then(response => {
            return response.blob();
        }).then(data => {
            return data;
        }).catch(e=>{
            console.log('getFile error', e);
        });
    }

    download(){
        return fetch(`/filedownload?path=${this.path}&name=${this.name}`).then(response => {
            return response.blob();
        }).then(data => {
            return data;
        }).catch(e=>{
            console.log('getFile error', e);
        });
    }
}