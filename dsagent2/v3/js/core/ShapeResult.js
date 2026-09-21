// ==================== ShapeResult 形状结果 ====================

class ShapeResult {
    constructor(data = {}) {
        this.shape = data.shape || SHAPES.COMPLEX;
        this.direction = data.direction || null;
        this.length = data.length || 0;
        this.positions = data.positions || [];
        this.center = data.center || null;
        this.color = data.color || null;
        this.extra = data.extra || {};
    }
    
    is(shapeName) {
        return this.shape === shapeName;
    }
    
    isHorizontal() { return this.direction === DIRECTION.SHORIZONTAL; }
    isVertical() { return this.direction === DIRECTION.VERTICAL; }
    
    get size() { return this.positions.length; }
    
    get keys() {
        return this.positions.map(p => posToKey(p.r, p.c));
    }
}

window.ShapeResult = ShapeResult;