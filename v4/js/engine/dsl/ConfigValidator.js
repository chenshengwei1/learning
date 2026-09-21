// ==================== ConfigValidator 配置校验器 ====================

class ConfigValidator {
    constructor(registries) {
        this.registries = registries;
        this.errors = [];
        this.warnings = [];
    }
    
    /**
     * 校验元素配置
     */
    validateElement(element) {
        this.errors = [];
        this.warnings = [];
        
        // 必填字段
        if (!element.id) this.errors.push('元素必须有 id');
        if (!element.name) this.warnings.push('建议给元素加 name');
        if (!element.category) this.errors.push('元素必须有 category');
        if (!element.svg) this.warnings.push('元素建议有 svg');
        
        // category 合法性
        if (element.category && !Object.values(ELEMENT_CATEGORIES).includes(element.category)) {
            this.errors.push(`未知 category：${element.category}`);
        }
        
        // 事件合法性
        if (element.events) {
            if (!Array.isArray(element.events)) {
                this.errors.push('events 必须是数组');
            } else {
                element.events.forEach((ev, i) => {
                    this._validateEvent(ev, `events[${i}]`);
                });
            }
        }
        
        return {
            valid: this.errors.length === 0,
            errors: this.errors,
            warnings: this.warnings
        };
    }
    
    _validateEvent(event, path) {
        if (!event.event) {
            this.errors.push(`${path}: 事件必须有 event 字段`);
            return;
        }
        
        if (!this.registries.events.has(event.event)) {
            this.errors.push(`${path}: 未知事件类型 "${event.event}"`);
            return;
        }
        
        if (!Array.isArray(event.actions)) {
            this.errors.push(`${path}: 事件必须有 actions 数组`);
            return;
        }
        
        event.actions.forEach((action, i) => {
            this._validateAction(action, `${path}.actions[${i}]`);
        });
    }
    
    _validateAction(action, path) {
        if (!action.type) {
            this.errors.push(`${path}: 动作必须有 type`);
            return;
        }
        
        if (!this.registries.actions.has(action.type)) {
            this.errors.push(`${path}: 未知动作类型 "${action.type}"`);
            return;
        }
        
        // 参数校验
        const def = this.registries.actions.get(action.type);
        const params = def.meta.params || [];
        
        for (const param of params) {
            if (param.required && action[param.name] === undefined) {
                this.errors.push(`${path}: 缺少必填参数 "${param.name}"`);
            }
        }
    }
    
    /**
     * 校验关卡配置
     */
    validateLevel(level) {
        this.errors = [];
        this.warnings = [];
        
        if (!level.id) this.errors.push('关卡必须有 id');
        if (!level.board) this.errors.push('关卡必须有 board');
        
        if (level.board) {
            if (!level.board.rows || !level.board.cols) {
                this.errors.push('board 必须有 rows 和 cols');
            }
        }
        
        if (level.goals && !Array.isArray(level.goals)) {
            this.errors.push('goals 必须是数组');
        }
        
        if (level.goals) {
            level.goals.forEach((goal, i) => {
                if (!goal.type) {
                    this.errors.push(`goals[${i}]: 目标必须有 type`);
                } else if (!this.registries.goals.has(goal.type)) {
                    this.errors.push(`goals[${i}]: 未知目标类型 "${goal.type}"`);
                }
            });
        }
        
        return {
            valid: this.errors.length === 0,
            errors: this.errors,
            warnings: this.warnings
        };
    }
}

window.ConfigValidator = ConfigValidator;