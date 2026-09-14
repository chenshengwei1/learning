// ==================== ShapeResult 形状结果 ====================

class ShapeResult {
    constructor(data = {}) {
        this.shape = data.shape || 'complex';
        this.direction = data.direction || null;
        this.length = data.length || 0;
        this.positions = data.positions || [];
        this.center = data.center || null;
        this.color = data.color || null;
        this.extra = data.extra || {};
    }
    
    // 判断是否为某形状
    is(shapeName) {
        return this.shape === shapeName;
    }
    
    // 判断方向
    isHorizontal() { return this.direction === 'horizontal'; }
    isVertical() { return this.direction === 'vertical'; }
    
    // 获取位置数量
    get size() { return this.positions.length; }
    
    // 获取所有位置 key
    get keys() {
        return this.positions.map(p => posToKey(p.r, p.c));
    }
}

window.ShapeResult = ShapeResult;