// ==================== PieceFactory 棋子工厂 ====================

class PieceFactory {
    constructor(registries, game) {
        this.registries = registries;
        this.game = game;   // ← 新增
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
     * 创建随机棋子（仅从 category=ELEMENT_CATEGORIES.PIECE 中选）
     */
    random() {
        const pieces = this.registries.elements
            .getByCategory(ELEMENT_CATEGORIES.PIECE)
            .filter(e => e.id !== 'empty')
            .filter(e => e.properties?.createable);
        if (pieces.length === 0) return null;
        // ← 改用 game.rng（如果没有，降级到 Math.random）
        const rng = this.game?.rng;
        const idx = rng ? rng.nextInt(pieces.length) : Math.floor(Math.random() * pieces.length);
        return this.create(pieces[idx].id);
    }
    
    /**
     * 创建特效棋子
     * 
     * 规则：
     * - 特效元素自己有 svg（如 rainbow-plus 的 @rainbow-bird）→ 用特效元素
     * - 否则用原动物（保留 svg/char/color），只加 effect 字段
     * 
     * @param {string} effectId - 特效类型（'line-horizontal' / 'bomb' / 'rainbow' / 'rainbow-plus' 等）
     * @param {Object} options
     *   - color: 原动物的 id（如 'fox'）
     *   - direction: 'horizontal' | 'vertical'
     *   - variant: 扩展字段
     *   - extra: 额外 stateData
     */
    createEffect(effectId, options = {}) {
        const effectDef = this.registries.elements.get(effectId);
        if (!effectDef) {
            console.warn(`[PieceFactory] createEffect: 找不到特效元素 "${effectId}"`);
            return null;
        }
        
        const baseColor = options.color;
        const baseDef = baseColor ? this.registries.elements.get(baseColor) : null;
        
        let piece;
        let source;
        
        if (effectDef.svg) {
            piece = this.create(effectId);
            source = `特效元素(${effectId})`;
        } else if (baseDef) {
            piece = this.create(baseColor);
            source = `原动物(${baseColor})`;
        } else {
            piece = this.create(effectId);
            source = `兜底(${effectId})`;
        }
        
        piece.effect = effectId;
        
        if (options.direction) piece.stateData.direction = options.direction;
        if (options.color) piece.stateData.color = options.color;
        if (options.variant) piece.stateData.variant = options.variant;
        if (options.extra) Object.assign(piece.stateData, options.extra);
        
        console.log(`[PieceFactory] createEffect(${effectId}) color=${baseColor || '-'} → id=${piece.id} svg=${piece.visual.svg || '-'} 来源=${source}`);
        
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