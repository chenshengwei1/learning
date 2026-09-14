// ==================== Piece 棋子 ====================

class Piece {
    constructor(def = {}) {
        // 身份
        this.id = def.id || 'unknown';
        this.effect = def.effect || null;
        
        // 视觉
        this.visual = {
            char: def.visual?.char ?? def.char ?? '',
            color: def.visual?.color ?? def.color ?? '#888',
            pattern: def.visual?.pattern ?? def.pattern ?? 'solid',
            patternColor: def.visual?.patternColor ?? def.patternColor ?? 'rgba(255,255,255,0.22)',
            pieceColor: def.visual?.pieceColor ?? def.pieceColor ?? '#ffffff',
            borderColor: def.visual?.borderColor ?? def.borderColor ?? 'rgba(255,255,255,0.3)',
            borderWidth: def.visual?.borderWidth ?? def.borderWidth ?? 2
        };
        
        // 属性层
        this.attrs = def.attrs ? { ...def.attrs } : {};
        
        // 特效数据
        this.stateData = def.stateData ? deepClone(def.stateData) : {};
        
        // 元数据
        this.metadata = def.metadata ? { ...def.metadata } : {};
    }
    
    // ===== 颜色（兼容旧 API） =====
    get color() { return this.visual.color; }
    set color(v) { this.visual.color = v; }
    
    get char() { return this.visual.char; }
    set char(v) { this.visual.char = v; }
    
    get pattern() { return this.visual.pattern; }
    set pattern(v) { this.visual.pattern = v; }
    
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