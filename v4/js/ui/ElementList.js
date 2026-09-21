// ==================== ElementList ====================

class ElementList {
    constructor(game, editor) {
        this.game = game;
        this.editor = editor;
    }
    
    init() {
        this.render();
        this._bindEvents();
    }
    
    render() {
        const el = document.getElementById('element-list');
        if (!el) return;
        
        const elements = this.game.registries.elements.getAll();
        const byCategory = {};
        for (const e of elements) {
            const cat = e.category || 'other';
            if (!byCategory[cat]) byCategory[cat] = [];
            byCategory[cat].push(e);
        }
        
        el.innerHTML = Object.entries(byCategory).map(([cat, items]) => `
            <div class="element-category">
                <h4>${this._categoryLabel(cat)}</h4>
                <div class="element-grid">
                    ${items.map(e => `
                        <div class="element-tile" data-id="${e.id}">
                            ${e.svg 
                                ? `<img src="${SVGLibrary.resolve(e.svg) || e.svg}" alt="${e.name}">` 
                                : `<div class="element-char">${e.char || '?'}</div>`}
                            <div class="element-name">${e.name || e.id}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
        
        // 绑定点击
        el.querySelectorAll('.element-tile').forEach(tile => {
            tile.addEventListener('click', () => {
                this.editor.open(tile.dataset.id);
            });
        });
    }
    
    _categoryLabel(cat) {
        const labels = {
            piece: '🎮 棋子',
            effect: '✨ 特效',
            obstacle: '🧊 障碍',
            target: '🍉 目标物',
            generator: '⚙️ 生成器',
            decoration: '🎨 装饰',
            other: '📦 其他'
        };
        return labels[cat] || cat;
    }
    
    _bindEvents() {
        // 新建元素
        document.getElementById('element-new-btn')?.addEventListener('click', () => {
            const id = prompt('请输入新元素 ID（英文）');
            if (!id) return;
            
            if (this.game.registries.elements.has(id)) {
                alert('该 ID 已存在');
                return;
            }
            
            // 创建空元素
            this.game.registries.elements.register({
                id,
                name: id,
                category: 'piece',
                svg: null,
                char: '❓',
                color: '#888888',
                properties: {},
                events: []
            });
            
            this.render();
            this.editor.open(id);
        });
    }
}

window.ElementList = ElementList;