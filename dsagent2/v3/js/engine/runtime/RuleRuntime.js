// ==================== RuleRuntime 规则运行时 ====================

class RuleRuntime {
    constructor(game, registries) {
        this.game = game;
        this.registries = registries;
        this.parser = new ExpressionParser(registries);
        this.validator = new ConfigValidator(registries);
        
        // 事件总线（运行时事件）
        this.eventBus = new EventBus();
        
        // 事件队列
        this.eventQueue = new EventQueue();
        
        // 元素监听器索引：eventType -> [{ elementId, config }]
        this.listeners = new Map();
        
        // 是否正在处理
        this.processing = false;
    }
    
    /**
     * 初始化：遍历所有元素，注册监听
     */
    init() {
        this.listeners.clear();
        
        for (const element of this.registries.elements.getAll()) {
            if (!element.events) continue;
            
            for (const eventConfig of element.events) {
                const eventType = eventConfig.event;
                if (!this.listeners.has(eventType)) {
                    this.listeners.set(eventType, []);
                }
                this.listeners.get(eventType).push({
                    elementId: element.id,
                    element,
                    config: eventConfig
                });
            }
        }
    }
    
    /**
     * 触发事件
     * @param {string} eventType - 事件类型（如 'piece:removed'）
     * @param {Object} data - 事件数据（包含变量作用域）
     */
    async emit(eventType, data = {}) {
        this.eventQueue.push({ type: eventType, data });
    }
    
    /**
     * 处理队列中的所有事件（主循环中调用）
     */
    async flush() {
        if (this.processing) return;
        this.processing = true;
        
        while (this.eventQueue.hasPending()) {
            const event = this.eventQueue.shift();
            await this._processEvent(event.type, event.data);
        }
        
        this.processing = false;
    }
    
    /**
     * 处理单个事件
     */
    async _processEvent(eventType, data) {
        const listeners = this._collectListeners(eventType, data);   // ← 传入 data
        for (const listener of listeners) {
            await this._executeListener(listener, eventType, data);
        }
        await this.eventBus.emit(eventType, data);
    }
    
    /**
     * 收集所有可能响应该事件的元素
     */
    _collectListeners(eventType, data) {
        const result = [];
        
        for (const [regEventType, listeners] of this.listeners) {
            if (!this._matchEventType(regEventType, eventType)) continue;
            
            for (const listener of listeners) {
                // piece:removed 的源元素检查（只对 piece:removed 生效）
                if (eventType === 'piece:removed' && data.piece) {
                    const piece = data.piece;
                    const listenerEl = listener.element;
                    const matched =
                        piece.element === listenerEl.id ||      // 普通棋子 / 障碍物 id 匹配
                        piece.effect === listenerEl.id ||       // 特效棋子：effect 匹配
                        listenerEl.category === 'obstacle' ||   // 障碍物兜底
                        listenerEl.category === 'generator';    // 生成器兜底
                    if (!matched) {
                        continue;
                    }
                }
                
                // adjacent:match 的源元素检查（只对 adjacent:match 生效）
                if (eventType === 'adjacent:match' && data.obstacle && data.obstacle.element && data.obstacle.element !== listener.element.id) {
                    continue;
                }
                
                // cell:cleared 的源元素检查（只对 cell:cleared 生效）
                if (eventType === 'cell:cleared' && data.obstacle && data.obstacle.element && data.obstacle.element !== listener.element.id) {
                    continue;
                }
                
                // obstacle:cleared 不做源元素过滤（目标物要响应它）
                
                result.push({ ...listener, registeredEvent: regEventType });
            }
        }
        
        return result;
    }
    
    /**
     * 判断注册的事件类型是否匹配触发的事件
     */
    _matchEventType(regType, firedType) {
        // 事件类型映射：注册名 -> 触发名
        const mapping = {
            'onMatch': ['match:done'],
            'onRemove': ['piece:removed'],
            'onCellCleared': ['cell:cleared'],   
            'onAnyMatch': ['any:match'],       
            'onObstacleCleared': ['obstacle:cleared', 'overlay:cleared'],   // ← 改：兼容两者
            'onOverlayCleared': ['overlay:cleared'],                         // ← 新增
            'onSwap': ['piece:swapped'],
            'onTurn': ['turn:end'],
            'onAdjacent': ['adjacent:match'],
            'onLand': ['piece:landed'],
            'onChain': ['chain:triggered'],
            'onCreate': ['effect:created']
        };
        
        const firedEvents = mapping[regType] || [];
        return firedEvents.includes(firedType);
    }
    
    /**
     * 执行监听器
     */
    async _executeListener(listener, eventType, data) {
        const { element, config } = listener;
        
        console.log(`[_executeListener] 元素=${element.id} 事件=${eventType}`);
        
        // piece:removed 的源元素检查（只对 piece:removed 生效）
               // piece:removed 的源元素检查（只对 piece:removed 生效）
        if (eventType === 'piece:removed' && data.piece) {
            const piece = data.piece;
            const matched =
                piece.element === element.id ||      // 普通棋子 / 障碍物 id 匹配
                piece.effect === element.id ||       // 特效棋子：effect 匹配
                element.category === 'obstacle' ||   // 障碍物兜底
                element.category === 'generator';    // 生成器兜底
            if (!matched) {
                console.log(`[_executeListener] ${element.id} 被 piece:removed 过滤跳过`);
                return;
            }
        }
        
        // adjacent:match 的源元素检查（只对 adjacent:match 生效）
        if (eventType === 'adjacent:match' && data.obstacle && data.obstacle.element && data.obstacle.element !== element.id) {
            console.log(`[_executeListener] ${element.id} 被 adjacent:match 源元素检查跳过`);
            return;
        }
        
        // cell:cleared 的源元素检查（只对 cell:cleared 生效）
        if (eventType === 'cell:cleared' && data.obstacle && data.obstacle.element && data.obstacle.element !== element.id) {
            console.log(`[_executeListener] ${element.id} 被 cell:cleared 源元素检查跳过`);
            return;
        }
        
        // obstacle:cleared 事件不做源元素过滤（所有监听者都能响应）
        
        // 1. 检查条件（when）
        if (config.when) {
            const conditionPassed = this._checkWhen(config.when, data);
            if (!conditionPassed) return;
        }
        
        console.log(`[_executeListener] ${element.id} 执行动作`);
        
        // 2. 构建变量作用域
        const context = this._buildContext(data, element);
        
        // 3. 执行所有动作
        if (Array.isArray(config.actions)) {
            for (const actionConfig of config.actions) {
                try {
                    const action = this.parser.parseAction(actionConfig);
                    await this.parser.executeAction(action, this.game, context);
                } catch (e) {
                    console.error(`执行动作失败 [${element.id}]:`, e);
                }
            }
        }
    }
    
    /**
     * 检查 when 条件
     */
    _checkWhen(when, data) {
        for (const [key, expected] of Object.entries(when)) {
            // ← 新增：'any' 通配
            if (expected === 'any') continue;
            
            const actual = data[key];
            
            if (Array.isArray(expected)) {
                if (!expected.includes(actual)) return false;
            }
            else if (typeof expected === 'object' && expected !== null) {
                if (expected.min !== undefined && actual < expected.min) return false;
                if (expected.max !== undefined && actual > expected.max) return false;
            }
            else {
                if (actual !== expected) return false;
            }
        }
        return true;
    }
    
    /**
     * 构建变量作用域
     */
    _buildContext(data, element) {
        return {
            // 事件数据
            ...data,
            
            // 事件源元素
            $element: element,
            $elementId: element.id,
            
            // 常用变量
            $r: data.r,
            $c: data.c,
            $color: data.color,
            $shape: data.shape,
            $direction: data.direction,
            
            // 游戏状态
            $game: this.game,
            $board: this.game.board,
            $score: this.game.score,
            $turn: this.game.turn,
            $combo: this.game.comboCount
        };
    }
    
    /**
     * 同步处理（立即执行，不排队）
     */
    async emitSync(eventType, data = {}) {
        await this._processEvent(eventType, data);
    }
}

window.RuleRuntime = RuleRuntime;