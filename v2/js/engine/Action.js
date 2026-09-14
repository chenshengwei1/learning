// ==================== Action 动作 ====================

class Action {
    constructor(type, params = {}) {
        this.type = type;
        this.params = params;
    }
    
    // ===== 工厂方法 =====
    
    static remove(targets, options = {}) {
        return new Action('remove', { targets, ...options });
    }
    
    static damage(targets, amount = 1, options = {}) {
        return new Action('damage', { targets, amount, ...options });
    }
    
    static convert(targets, options = {}) {
        return new Action('convert', { targets, ...options });
    }
    
    static spawn(effectName, position, options = {}) {
        return new Action('spawn', { effectName, position, ...options });
    }
    
    static trigger(targets, options = {}) {
        return new Action('trigger', { targets, ...options });
    }
    
    static custom(fn) {
        return new Action('custom', { fn });
    }
    
    // ===== 解析目标 =====
    resolveTargets(board, context) {
        const { targets } = this.params;
        if (typeof targets === 'function') {
            return targets(board, context);
        }
        if (targets instanceof Set) {
            return targets;
        }
        return new Set();
    }
}

window.Action = Action;