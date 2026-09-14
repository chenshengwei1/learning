// ==================== RuleParser 规则解析 ====================

class RuleParser {
    constructor() {
        this.effects = new Map();
        this.swapHandlers = new Map();
    }
    
    // ===== 注册特效 =====
    parseEffect(name, def) {
        const effect = {
            name,
            visual: def.visual || {},
            create: this._parseCreateRule(def.create),
            trigger: this._parseTriggerRule(def.trigger),
            swap: def.swap || {}
        };
        this.effects.set(name, effect);
        return effect;
    }
    
    _parseCreateRule(create) {
        if (!create) return null;
        return {
            condition: create.when,
            place: create.place || 'middle',
            direction: create.direction !== undefined ? create.direction : null,
            color: create.color !== undefined ? create.color : '$color'
        };
    }
    
    _parseTriggerRule(trigger) {
        if (!trigger) return null;
        return {
            targets: trigger.targets,
            damage: trigger.damage || 1
        };
    }
    
    // ===== 注册交换处理器 =====
    registerSwapHandler(name, handler) {
        this.swapHandlers.set(name, handler);
    }
    
    // ===== 查询 =====
    getEffect(name) {
        return this.effects.get(name) || null;
    }
    
    getSwapHandler(name) {
        return this.swapHandlers.get(name) || null;
    }
    
    hasEffect(name) {
        return this.effects.has(name);
    }
    
    getAllEffects() {
        return Array.from(this.effects.values());
    }
}

window.RuleParser = RuleParser;