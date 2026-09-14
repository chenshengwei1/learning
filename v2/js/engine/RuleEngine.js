// ==================== RuleEngine 规则引擎 ====================

class RuleEngine {
    constructor(game) {
        this.game = game;
        this.parser = new RuleParser();
        this.eventBus = game.eventBus || new EventBus();
        this.matchRules = [];
    }
    
    // ===== 注册接口 =====
    
    registerEffect(name, def) {
        this.parser.parseEffect(name, def);
        return this;
    }
    
    registerSwapHandler(name, handler) {
        this.parser.registerSwapHandler(name, handler);
        return this;
    }
    
    registerMatchRule(rule) {
        this.matchRules.push(rule);
        this.matchRules.sort((a, b) => (b.priority || 0) - (a.priority || 0));
        return this;
    }
    
    // ===== 合成：匹配后决定生成什么特效 =====
    
    resolveCreation(matches, shapeResult) {
        if (!shapeResult) return null;
        
        for (const effect of this.parser.getAllEffects()) {
            if (!effect.create) continue;
            if (effect.create.condition && effect.create.condition.match(shapeResult)) {
                return {
                    effect: effect.name,
                    place: effect.create.place,
                    direction: this._resolveDirection(effect.create.direction, shapeResult),
                    color: this._resolveColor(effect.create.color, shapeResult),
                    def: effect
                };
            }
        }
        return null;
    }
    
    _resolveDirection(direction, shapeResult) {
        if (direction === '$shapeDirection') return shapeResult.direction;
        return direction;
    }
    
    _resolveColor(color, shapeResult) {
        if (color === '$color') return shapeResult.color;
        return color;
    }
    
    // ===== 触发：特效被消除时执行 =====
    
    async resolveTrigger(effectName, context) {
        const effect = this.parser.getEffect(effectName);
        if (!effect || !effect.trigger) return new Set();
        
        const targets = this.executeSelector(effect.trigger.targets, context);
        const affected = await this.executeRemove(targets, effect.trigger.damage, context);
        
        return affected;
    }
    
    // ===== 交换：两个棋子交换时执行 =====
    
    async resolveSwap(p1, p2, pos1, pos2) {
        const effect1 = p1?.effect;
        const effect2 = p2?.effect;
        
        // 无特效
        if (!effect1 && !effect2) return null;
        
        // 单特效：触发该特效
        if (effect1 && !effect2) {
            const targets = await this._triggerEffect(effect1, p1, pos2);
            return { targets, phases: [{ targets, damage: 1 }] };
        }
        if (!effect1 && effect2) {
            const targets = await this._triggerEffect(effect2, p2, pos1);
            return { targets, phases: [{ targets, damage: 1 }] };
        }
        
        // 双特效：查找交换处理器
        const def1 = this.parser.getEffect(effect1);
        const def2 = this.parser.getEffect(effect2);
        
        const handlerName = def1?.swap?.[effect2]
                         || def2?.swap?.[effect1]
                         || 'defaultTrigger';
        
        const handler = this.parser.getSwapHandler(handlerName);
        if (!handler) {
            return this._defaultSwapTrigger(p1, p2, pos1, pos2);
        }
        
        const result = await handler(this.game, p1, p2, pos1, pos2);
        return result;
    }
    
    async _triggerEffect(effectName, piece, pos) {
        const effect = this.parser.getEffect(effectName);
        if (!effect || !effect.trigger) return new Set();
        
        const context = {
            r: pos.r,
            c: pos.c,
            color: piece.stateData?.color || piece.id,
            direction: piece.stateData?.direction,
            ...piece.stateData
        };
        
        return this.executeSelector(effect.trigger.targets, context);
    }
    
    async _defaultSwapTrigger(p1, p2, pos1, pos2) {
        const targets = new Set();
        
        if (p1.effect) {
            const t1 = await this._triggerEffect(p1.effect, p1, pos2);
            for (const k of t1) targets.add(k);
        }
        if (p2.effect) {
            const t2 = await this._triggerEffect(p2.effect, p2, pos1);
            for (const k of t2) targets.add(k);
        }
        
        return { targets, phases: [{ targets, damage: 1 }] };
    }
    
    // ===== 执行选择器 =====
    
    executeSelector(selector, context) {
        if (!selector) return new Set();
        if (typeof selector === 'function') {
            return selector(this.game.board, context);
        }
        if (selector instanceof Set) {
            return selector;
        }
        return new Set();
    }
    
    // ===== 执行消除 =====
    
    async executeRemove(targets, damage = 1, context = {}) {
        const affected = new Set();
        
        for (const key of targets) {
            const { r, c } = keyToPos(key);
            const piece = this.game.board.get(r, c);
            if (!piece) continue;
            
            if (piece.isRemovable()) {
                affected.add(key);
            } else {
                // 不可消除：造成属性伤害
                await this.damagePiece(piece, damage, { r, c });
            }
        }
        
        // 通知游戏引擎执行消除
        await this.game.removePieces(affected, context);
        
        return affected;
    }
    
    async damagePiece(piece, damage, pos) {
        for (const attrName of Object.keys(piece.attrs)) {
            if (attrName === 'locked') continue;
            const current = piece.attrs[attrName];
            if (current > 0) {
                piece.attrs[attrName] = Math.max(0, current - damage);
                await this.eventBus.emit('attr:damaged', {
                    piece, attrName, pos, damage
                });
            }
        }
    }
    
    // ===== 获取特效配置 =====
    
    getEffect(name) {
        return this.parser.getEffect(name);
    }
}

window.RuleEngine = RuleEngine;