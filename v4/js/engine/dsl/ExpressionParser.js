// ==================== ExpressionParser 表达式解析器 ====================

class ExpressionParser {
    constructor(registries) {
        this.registries = registries;
    }
    
    /**
     * 解析选择器配置
     * @param {Object|string} config - 选择器配置
     *   { type: 'row', param: '$r' }
     *   或 'self' | 'all'
     * @param {Object} context - 变量作用域
     * @returns {Set<string>} - 位置集合
     */
    resolveSelector(config, board, context = {}) {
        if (!config) return new Set();
        
        // 简写形式
        if (typeof config === 'string') {
            return this._resolveShortSelector(config, board, context);
        }
        
        // 数组形式：多个选择器并集
        if (Array.isArray(config)) {
            const result = new Set();
            for (const item of config) {
                const set = this.resolveSelector(item, board, context);
                for (const key of set) result.add(key);
            }
            return result;
        }
        
        // 对象形式
        const { type, ...params } = config;
        const selector = this.registries.selectors.get(type);
        if (!selector) {
            console.warn(`未知选择器：${type}`);
            return new Set();
        }
        
        // 解析参数中的变量
        const resolvedParams = VariableResolver.resolveDeep(params, context);
        
        return selector.resolve(board, resolvedParams, context);
    }
    
    _resolveShortSelector(name, board, context) {
        const shortcuts = {
            'self': () => {
                if (context.$r === undefined) return new Set();
                return new Set([posToKey(context.$r, context.$c)]);
            },
            'all': () => {
                const result = new Set();
                board.forEach((_, r, c) => result.add(posToKey(r, c)));
                return result;
            },
            'sameColor': () => {
                const color = context.$color;
                if (!color) return new Set();
                const result = new Set();
                board.forEach((p, r, c) => {
                    if (p?.id === color) result.add(posToKey(r, c));
                });
                return result;
            }
        };
        
        const fn = shortcuts[name];
        return fn ? fn() : new Set();
    }
    
    /**
     * 解析条件配置
     * @param {Object} config - 条件配置
     * @param {Object} data - 数据（shapeResult 或事件数据）
     * @returns {boolean}
     */
    matchCondition(config, data) {
        if (!config) return true;
        
        // 数组：全部满足
        if (Array.isArray(config)) {
            return config.every(c => this.matchCondition(c, data));
        }
        
        const { type, ...params } = config;
        const condition = this.registries.conditions.get(type);
        if (!condition) {
            console.warn(`未知条件：${type}`);
            return false;
        }
        
        return condition.match(params, data);
    }
    
    /**
     * 解析动作配置
     * @param {Object} config - 动作配置
     *   { type: 'damage', targets: {...}, amount: 1 }
     * @returns {Object} - 解析后的动作
     */
    parseAction(config) {
        if (!config?.type) throw new Error('动作配置必须有 type');
        
        const action = this.registries.actions.get(config.type);
        if (!action) {
            throw new Error(`未知动作：${config.type}`);
        }
        
        // 参数校验
        if (action.validate) {
            action.validate(config);
        }
        
        return {
            definition: action,
            config
        };
    }
    
    /**
     * 执行动作
     */
    async executeAction(action, game, context) {
        const { definition, config } = action;
        
        // 解析配置中的变量
        const resolvedConfig = VariableResolver.resolveDeep(config, context);
        
        // 执行
        return await definition.execute(game, resolvedConfig, context);
    }
}

window.ExpressionParser = ExpressionParser;