// ==================== Piece 棋子 ====================

class Piece {
    constructor(def = {}) {
        // 身份
        this.id = def.id || 'unknown';
        this.element = def.element || null;    // 元素 id（如 'fox'）
        this.effect = def.effect || null;       // 特效类型（如 'line'）
        
        // 视觉
        this.visual = {
            svg: def.svg || def.visual?.svg || null,
            image: def.image || def.visual?.image || null,
            char: def.char || def.visual?.char || '',
            color: def.color || def.visual?.color || '#888',
            pattern: def.pattern || def.visual?.pattern || 'solid',
            patternColor: def.patternColor || def.visual?.patternColor || 'rgba(255,255,255,0.22)',
            pieceColor: def.pieceColor || def.visual?.pieceColor || '#ffffff',
            borderColor: def.borderColor || def.visual?.borderColor || 'rgba(255,255,255,0.3)',
            borderWidth: def.borderWidth ?? def.visual?.borderWidth ?? 2
        };
        
        // 属性层（数值）
        this.attrs = def.attrs ? { ...def.attrs } : {};
        
        // 状态数据（对象）
        this.stateData = def.stateData ? deepClone(def.stateData) : {};
        
        // 元数据
        this.metadata = def.metadata ? { ...def.metadata } : {};
    }
    
    // ===== 快捷访问 =====
    get color() { return this.visual.color; }
    set color(v) { this.visual.color = v; }
    
    get char() { return this.visual.char; }
    set char(v) { this.visual.char = v; }
    
    get svg() { return this.visual.svg; }
    set svg(v) { this.visual.svg = v; }
    
    // ===== 属性操作 =====
    getAttr(name) {
        return this.attrs[name] ?? 0;
    }
    
    setAttr(name, value) {
        this.attrs[name] = value;
    }
    
    addAttr(name, delta = 1) {
        this.attrs[name] = (this.attrs[name] || 0) + delta;
    }
    
    hasAttr(name) {
        return (this.attrs[name] || 0) > 0;
    }
    
    // ===== 状态判断 =====
    isRemovable() {
        return !this.hasAttr('locked');
    }
    
    isSwappable() {
        return !this.hasAttr('locked') && !this.hasAttr('frozen');
    }
    
    isEffect() {
        return !!this.effect;
    }
    
    // ===== 克隆 =====
    clone() {
        return new Piece({
            id: this.id,
            element: this.element,
            effect: this.effect,
            visual: { ...this.visual },
            attrs: { ...this.attrs },
            stateData: deepClone(this.stateData),
            metadata: { ...this.metadata }
        });
    }
    
    // ===== 序列化 =====
    serialize() {
        return {
            id: this.id,
            element: this.element,
            effect: this.effect,
            visual: { ...this.visual },
            attrs: { ...this.attrs },
            stateData: deepClone(this.stateData),
            metadata: { ...this.metadata }
        };
    }
    
    static deserialize(obj) {
        if (!obj) return null;
        return new Piece(obj);
    }
}

window.Piece = Piece;