// ==================== PieceFactory 棋子工厂 ====================

class PieceFactory {
    constructor(registries) {
        this.registries = registries;
    }
    
    /**
     * 从元素注册表创建棋子
     */
    create(elementId) {
        const element = this.registries.elements.get(elementId);
        if (!element) {
            return new Piece({
                id: 'unknown',
                visual: { char: '❓', color: '#888', svg: null }
            });
        }
        
        return new Piece({
            id: elementId,
            element: elementId,
            effect: element.effect || null,
            svg: element.svg,
            char: element.char,
            color: element.color || '#888',
            pattern: element.pattern || 'solid',
            patternColor: element.patternColor,
            pieceColor: element.pieceColor,
            borderColor: element.borderColor,
            borderWidth: element.borderWidth,
            attrs: { ...(element.properties || {}) },
            stateData: {}
        });
    }
    
    /**
     * 创建随机棋子（仅从 category='piece' 中选）
     */
    random() {
        const pieces = this.registries.elements
            .getByCategory(ELEMENT_CATEGORIES.PIECE)
            .filter(e => e.id !== 'empty');   // ← 排除 empty
        if (pieces.length === 0) return null;
        const idx = Math.floor(Math.random() * pieces.length);
        return this.create(pieces[idx].id);
    }
    
    /**
     * 创建特效棋子
     */
    createEffect(elementId, options = {}) {
        const element = this.registries.elements.get(elementId);
        if (!element) return null;
        
        const piece = this.create(elementId);
        piece.effect = elementId;
        
        if (options.direction) piece.stateData.direction = options.direction;
        if (options.color) piece.stateData.color = options.color;
        if (options.extra) Object.assign(piece.stateData, options.extra);
        
        return piece;
    }
    
    /**
     * 从序列化数据创建
     */
    deserialize(obj) {
        return Piece.deserialize(obj);
    }
    
    /**
     * 获取所有棋子元素 id
     */
    getAllPieceIds() {
        return this.registries.elements
            .getByCategory(ELEMENT_CATEGORIES.PIECE)
            .map(e => e.id);
    }
}

window.PieceFactory = PieceFactory;