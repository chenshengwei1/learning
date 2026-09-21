// ==================== ElementEditor ====================

class ElementEditor {
    constructor(game) {
        this.game = game;
        this.registries = game.registries;
        this.currentElement = null;
        this._bound = false;
    }
    
    // ==================== 初始化 ====================
    
    init() {
        if (this._bound) return;
        this._bound = true;
        this._bindStaticEvents();
    }
    
    /**
     * 绑定固定的按钮（弹层上的按钮，不随 _render 变化）
     */
    _bindStaticEvents() {
        document.getElementById('element-save-btn')?.addEventListener('click', () => {
            this._save();
        });
        
        document.getElementById('element-close-btn')?.addEventListener('click', () => {
            this.close();
        });
        
        document.getElementById('element-test-btn')?.addEventListener('click', () => {
            this._test();
        });
        
        // 点击遮罩关闭
        document.getElementById('element-editor')?.addEventListener('click', (e) => {
            if (e.target.id === 'element-editor') this.close();
        });
        
        // ESC 关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.close();
        });
    }
    
    // ==================== 打开 / 关闭 ====================
    
    open(elementId) {
        const element = this.registries.elements.get(elementId);
        if (!element) {
            this.game.showMessage('元素不存在');
            return;
        }
        
        this.currentElement = deepClone(element);
        this._render();
        
        const panel = document.getElementById('element-editor');
        if (panel) panel.classList.remove('hidden');
    }
    
    close() {
        const panel = document.getElementById('element-editor');
        if (panel) panel.classList.add('hidden');
        this.currentElement = null;
    }
    
    // ==================== 渲染 ====================
    
    _render() {
        const el = document.getElementById('element-editor-content');
        if (!el || !this.currentElement) return;
        
        const element = this.currentElement;
        
        el.innerHTML = `
            <div class="form-section">
                <h3>📦 基础信息</h3>
                <div class="form-row">
                    <label>ID <input type="text" id="edit-id" value="${this._escape(element.id)}" readonly></label>
                    <label>名称 <input type="text" id="edit-name" value="${this._escape(element.name || '')}"></label>
                </div>
                <div class="form-row">
                    <label>分类
                        <select id="edit-category">
                            ${this._renderSelectOptions(
                                Object.values(ELEMENT_CATEGORIES),
                                element.category
                            )}
                        </select>
                    </label>
                    <label>SVG 路径 <input type="text" id="edit-svg" value="${this._escape(element.svg || '')}"></label>
                </div>
                <div class="form-row">
                    <label>字符 <input type="text" id="edit-char" value="${this._escape(element.char || '')}"></label>
                    <label>颜色 <input type="color" id="edit-color" value="${element.color || '#888888'}"></label>
                </div>
            </div>
            
            <div class="form-section">
                <h3>⚙️ 属性</h3>
                <div id="edit-properties"></div>
                <button type="button" class="btn-secondary" id="edit-add-property">+ 添加属性</button>
            </div>
            
            <div class="form-section">
                <h3>🎯 事件响应</h3>
                <div id="edit-events"></div>
                <button type="button" class="btn-secondary" id="edit-add-event">+ 添加事件</button>
            </div>
        `;
        
        this._renderProperties();
        this._renderEvents();
        this._bindDynamicEvents();
    }
    
    /**
     * 绑定动态生成的元素（每次 _render 后都要重新绑）
     */
    _bindDynamicEvents() {
        // 基础字段
        const bindField = (id, field) => {
            const el = document.getElementById(id);
            if (!el) return;
            const handler = () => { this.currentElement[field] = el.value; };
            el.addEventListener('change', handler);
            el.addEventListener('input', handler);
        };
        
        bindField('edit-name', 'name');
        bindField('edit-category', 'category');
        bindField('edit-svg', 'svg');
        bindField('edit-char', 'char');
        bindField('edit-color', 'color');
        
        // 添加属性
        document.getElementById('edit-add-property')?.addEventListener('click', () => {
            this.currentElement.properties = this.currentElement.properties || {};
            const key = `prop${Object.keys(this.currentElement.properties).length + 1}`;
            this.currentElement.properties[key] = 1;
            this._renderProperties();
        });
        
        // 添加事件
        document.getElementById('edit-add-event')?.addEventListener('click', () => {
            const eventTypes = this.registries.events.getAllMeta();
            if (eventTypes.length === 0) return;
            
            this.currentElement.events = this.currentElement.events || [];
            this.currentElement.events.push({
                event: eventTypes[0].type,
                when: {},
                actions: []
            });
            this._renderEvents();
        });
    }
    
    // ==================== 属性列表 ====================
    
    _renderProperties() {
        const el = document.getElementById('edit-properties');
        if (!el) return;
        
        const props = this.currentElement.properties || {};
        const keys = Object.keys(props);
        
        if (keys.length === 0) {
            el.innerHTML = '<p class="hint">暂无属性</p>';
            return;
        }
        
        el.innerHTML = keys.map(key => `
            <div class="form-row property-row" data-key="${this._escape(key)}">
                <input type="text" class="prop-key" value="${this._escape(key)}" placeholder="属性名">
                <input type="text" class="prop-value" value="${this._escape(String(props[key]))}" placeholder="值">
                <button type="button" class="btn-icon remove-prop">✖</button>
            </div>
        `).join('');
        
        // 删除按钮
        el.querySelectorAll('.remove-prop').forEach(btn => {
            btn.addEventListener('click', () => {
                const row = btn.closest('.property-row');
                const key = row.dataset.key;
                delete this.currentElement.properties[key];
                this._renderProperties();
            });
        });
        
        // 修改
        el.querySelectorAll('.property-row').forEach(row => {
            const oldKey = row.dataset.key;
            const keyInput = row.querySelector('.prop-key');
            const valInput = row.querySelector('.prop-value');
            
            const update = () => {
                const newKey = keyInput.value.trim();
                const newVal = valInput.value.trim();
                if (!newKey) return;
                
                // 删除旧 key
                if (oldKey && oldKey !== newKey) {
                    delete this.currentElement.properties[oldKey];
                }
                // 加新 key
                this.currentElement.properties[newKey] = 
                    /^-?\d+(\.\d+)?$/.test(newVal) ? Number(newVal) : newVal;
                
                row.dataset.key = newKey;
            };
            
            keyInput.addEventListener('change', update);
            valInput.addEventListener('change', update);
        });
    }
    
    // ==================== 事件列表 ====================
    
    _renderEvents() {
        const el = document.getElementById('edit-events');
        if (!el) return;
        
        const events = this.currentElement.events || [];
        
        if (events.length === 0) {
            el.innerHTML = '<p class="hint">暂无事件</p>';
            return;
        }
        
        el.innerHTML = events.map((ev, i) => this._renderEventCard(ev, i)).join('');
        this._bindEventCardEvents();
    }
    
    _bindEventCardEvents() {
        const el = document.getElementById('edit-events');
        if (!el) return;
        
        // 删除事件
        el.querySelectorAll('.remove-event').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = Number(btn.dataset.idx);
                this.currentElement.events.splice(idx, 1);
                this._renderEvents();
            });
        });
        
        // 切换事件类型
        el.querySelectorAll('.event-type-select').forEach(sel => {
            sel.addEventListener('change', () => {
                const idx = Number(sel.dataset.idx);
                this.currentElement.events[idx].event = sel.value;
                this.currentElement.events[idx].when = {};
                this._renderEvents();
            });
        });
        
        // 绑定 when 参数
        el.querySelectorAll('.event-when input, .event-when select').forEach(input => {
            input.addEventListener('change', () => {
                this._syncWhenFromInput(input);
            });
        });
        
        // 绑定 action 参数
        el.querySelectorAll('.action-card input[data-param], .action-card select[data-param], .action-card textarea[data-param]').forEach(input => {
            input.addEventListener('change', () => {
                this._syncActionFromInput(input);
            });
        });
        
        // 添加动作
        el.querySelectorAll('.add-action').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = Number(btn.dataset.idx);
                this._openActionPicker(idx);
            });
        });
        
        // 删除动作
        el.querySelectorAll('.remove-action').forEach(btn => {
            btn.addEventListener('click', () => {
                const [eventIdx, actionIdx] = btn.dataset.idx.split('-').map(Number);
                this.currentElement.events[eventIdx].actions.splice(actionIdx, 1);
                this._renderEvents();
            });
        });
    }
    
    _renderEventCard(event, idx) {
        const eventDef = this.registries.events.get(event.event);
        const allEventTypes = this.registries.events.getAllMeta();
        const eventOptions = allEventTypes.map(e => 
            `<option value="${e.type}" ${e.type === event.event ? 'selected' : ''}>${e.label}</option>`
        ).join('');
        
        const whenHtml = this._renderWhenParams(event, eventDef, idx);
        
        const actionsHtml = (event.actions || []).map((action, aIdx) => 
            this._renderActionCard(action, idx, aIdx)
        ).join('');
        
        return `
            <div class="event-card" data-idx="${idx}">
                <div class="event-header">
                    <select class="event-type-select" data-idx="${idx}">${eventOptions}</select>
                    <button type="button" class="btn-icon remove-event" data-idx="${idx}">✖</button>
                </div>
                
                ${whenHtml ? `<div class="event-when">${whenHtml}</div>` : ''}
                
                <div class="event-actions">
                    <div class="actions-label">动作：</div>
                    ${actionsHtml || '<div class="hint">暂无动作</div>'}
                    <button type="button" class="btn-secondary add-action" data-idx="${idx}">+ 添加动作</button>
                </div>
            </div>
        `;
    }
    
    _renderWhenParams(event, eventDef, eventIdx) {
        if (!eventDef?.meta?.params) return '';
        
        const params = eventDef.meta.params;
        if (params.length === 0) return '';
        
        return params.map(param => {
            const value = event.when?.[param.name] ?? param.default ?? '';
            return `
                <label class="inline-param">
                    ${param.label}：
                    ${this._renderParamInput(param, value, `when-${eventIdx}-${param.name}`)}
                </label>
            `;
        }).join('');
    }
    
    _renderActionCard(action, eventIdx, actionIdx) {
        const actionDef = this.registries.actions.get(action.type);
        if (!actionDef) return '';
        
        const label = actionDef.meta?.label || action.type;
        const params = actionDef.meta?.params || [];
        
        const paramsHtml = params.map(param => {
            const value = action[param.name] ?? param.default ?? '';
            return `
                <label class="inline-param">
                    ${param.label}：
                    ${this._renderParamInput(param, value, `action-${eventIdx}-${actionIdx}-${param.name}`)}
                </label>
            `;
        }).join('');
        
        return `
            <div class="action-card">
                <div class="action-header">
                    <span class="action-label">${label}</span>
                    <button type="button" class="btn-icon remove-action" data-idx="${eventIdx}-${actionIdx}">✖</button>
                </div>
                <div class="action-params">${paramsHtml}</div>
            </div>
        `;
    }
    
    _renderParamInput(param, value, id) {
        const attrs = `id="${id}" data-param="${param.name}"`;
        
        switch (param.type) {
            case 'number':
                return `<input type="number" ${attrs} value="${value}" min="${param.min ?? ''}" max="${param.max ?? ''}">`;
            case 'boolean':
                return `<input type="checkbox" ${attrs} ${value ? 'checked' : ''}>`;
            case 'string':
                return `<input type="text" ${attrs} value="${this._escape(value)}">`;
            case 'enum': {
                const opts = (param.options || []).map(o => 
                    `<option value="${o.value ?? ''}" ${String(o.value) === String(value) ? 'selected' : ''}>${o.label}</option>`
                ).join('');
                return `<select ${attrs}>${opts}</select>`;
            }
            case 'elementRef': {
                const pieces = this.registries.elements.getAll();
                const opts = `<option value="">— 无 —</option>` + pieces.map(e => 
                    `<option value="${e.id}" ${e.id === value ? 'selected' : ''}>${e.name || e.id}</option>`
                ).join('');
                return `<select ${attrs}>${opts}</select>`;
            }
            case 'selector':
            case 'condition':
            case 'actionList':
            case 'conditionList':
            case 'goalList':
                return `<textarea ${attrs} rows="3" placeholder="JSON 配置">${this._escape(JSON.stringify(value, null, 2))}</textarea>`;
            default:
                return `<input type="text" ${attrs} value="${this._escape(String(value))}">`;
        }
    }
    
    // ==================== 同步输入 ====================
    
    _syncWhenFromInput(input) {
        const card = input.closest('.event-card');
        if (!card) return;
        const eventIdx = Number(card.dataset.idx);
        const event = this.currentElement.events[eventIdx];
        if (!event) return;
        
        const paramName = input.dataset.param;
        if (!paramName) return;
        
        let value = input.type === 'checkbox' ? input.checked : input.value;
        if (input.type === 'number') value = Number(value);
        else if (/^-?\d+(\.\d+)?$/.test(value)) value = Number(value);
        
        event.when = event.when || {};
        if (value === '' || value === undefined) {
            delete event.when[paramName];
        } else {
            event.when[paramName] = value;
        }
    }
    
    _syncActionFromInput(input) {
        const card = input.closest('.action-card');
        if (!card) return;
        
        const eventCard = input.closest('.event-card');
        const eventIdx = Number(eventCard.dataset.idx);
        const event = this.currentElement.events[eventIdx];
        if (!event) return;
        
        // 找 action 索引
        const allActions = eventCard.querySelectorAll('.action-card');
        const actionIdx = Array.from(allActions).indexOf(card);
        const action = event.actions[actionIdx];
        if (!action) return;
        
        const paramName = input.dataset.param;
        if (!paramName) return;
        
        let value = input.type === 'checkbox' ? input.checked : input.value;
        if (input.type === 'number') value = Number(value);
        else if (input.tagName === 'TEXTAREA' && value) {
            try { value = JSON.parse(value); }
            catch { /* 保留字符串 */ }
        } else if (/^-?\d+(\.\d+)?$/.test(value)) value = Number(value);
        
        action[paramName] = value;
    }
    
    // ==================== 动作选择器 ====================
    
    _openActionPicker(eventIdx) {
        const actionsMeta = this.registries.actions.getMetaByCategory();
        
        const groupsHtml = Object.entries(actionsMeta).map(([cat, actions]) => `
            <div class="action-category">
                <h4>${cat}</h4>
                <div class="action-list">
                    ${actions.map(a => 
                        `<button type="button" class="action-pick-btn" data-type="${a.type}">${a.label}</button>`
                    ).join('')}
                </div>
            </div>
        `).join('');
        
        const picker = document.createElement('div');
        picker.className = 'action-picker-overlay';
        picker.innerHTML = `
            <div class="action-picker">
                <h3>选择动作</h3>
                ${groupsHtml}
                <button type="button" class="btn-secondary close-picker">取消</button>
            </div>
        `;
        document.body.appendChild(picker);
        
        picker.querySelectorAll('.action-pick-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.type;
                const def = this.registries.actions.get(type);
                
                const action = { type };
                for (const param of def.meta.params || []) {
                    if (param.default !== undefined) {
                        action[param.name] = param.default;
                    }
                }
                
                const event = this.currentElement.events[eventIdx];
                if (!event.actions) event.actions = [];
                event.actions.push(action);
                
                picker.remove();
                this._renderEvents();
            });
        });
        
        picker.querySelector('.close-picker').addEventListener('click', () => picker.remove());
        picker.addEventListener('click', (e) => {
            if (e.target === picker) picker.remove();
        });
    }
    
    // ==================== 保存 / 测试 ====================
    
    _save() {
        if (!this.currentElement) return;
        
        this._syncFromForm();
        
        this.registries.elements.register(this.currentElement);
        
        const allElements = this.registries.elements.getAll();
        this.game.saveSystem.saveElements(allElements);
        
        this.game.ruleRuntime.init();

        // ← 新增：刷新元素列表
        if (this.game.elementList) {
            this.game.elementList.render();
        }
        
        this.game.showMessage(`✅ 元素已保存：${this.currentElement.name}`);
        this.close();
    }
    
    _test() {
        if (!this.currentElement) return;
        
        this._syncFromForm();
        
        const midR = Math.floor(this.game.board.rows / 2);
        const midC = Math.floor(this.game.board.cols / 2);
        
        const piece = this.game.pieceFactory.create(this.currentElement.id);
        if (piece) {
            this.game.board.set(midR, midC, piece);
            this.game.renderSystem.renderPartial(new Set([posToKey(midR, midC)]));   // ← 改这里
            this.game.showMessage(`已在 (${midR + 1}, ${midC + 1}) 放置测试元素`);
        }
    }
    
    /**
     * 从表单同步所有字段（保存前调用）
     */
    _syncFromForm() {
        if (!this.currentElement) return;
        
        // 从 DOM 读取当前值
        const getName = document.getElementById('edit-name');
        const getCategory = document.getElementById('edit-category');
        const getSvg = document.getElementById('edit-svg');
        const getChar = document.getElementById('edit-char');
        const getColor = document.getElementById('edit-color');
        
        if (getName) this.currentElement.name = getName.value;
        if (getCategory) this.currentElement.category = getCategory.value;
        if (getSvg) this.currentElement.svg = getSvg.value;
        if (getChar) this.currentElement.char = getChar.value;
        if (getColor) this.currentElement.color = getColor.value;
        
        // 属性
        const propRows = document.querySelectorAll('.property-row');
        const props = {};
        propRows.forEach(row => {
            const k = row.querySelector('.prop-key')?.value?.trim();
            const v = row.querySelector('.prop-value')?.value?.trim();
            if (k) {
                props[k] = /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : v;
            }
        });
        this.currentElement.properties = props;
    }
    
    // ==================== 辅助 ====================
    
    _renderSelectOptions(options, selected) {
        return options.map(o => {
            const val = typeof o === 'object' ? o.value : o;
            const label = typeof o === 'object' ? o.label : o;
            return `<option value="${val}" ${val === selected ? 'selected' : ''}>${label}</option>`;
        }).join('');
    }
    
    _escape(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
}

window.ElementEditor = ElementEditor;