// ==================== PieceFactory 棋子工厂 ====================

class PieceFactory {
    constructor(config) {
        this.config = config;
        this._pieceTypes = config.pieceTypes || [];
    }
    
    // 更新配置
    updateConfig(config) {
        this.config = config;
        this._pieceTypes = config.pieceTypes || [];
    }
    
    // 获取棋子类型定义
    getTypeDef(id) {
        return this._pieceTypes.find(t => t.id === id || t.code === id);
    }
    
    // 创建指定类型的棋子
    create(typeId) {
        const def = this.getTypeDef(typeId);
        if (!def) {
            return new Piece({
                id: 'unknown',
                visual: { char: '❓', color: '#888', pattern: 'solid' }
            });
        }
        return new Piece({
            id: def.id,
            visual: {
                char: def.char,
                color: def.color,
                pattern: def.pattern,
                patternColor: def.patternColor,
                pieceColor: def.pieceColor,
                borderColor: def.borderColor,
                borderWidth: def.borderWidth
            }
        });
    }
    
    // 创建随机棋子
    random() {
        if (this._pieceTypes.length === 0) return null;
        const idx = Math.floor(Math.random() * this._pieceTypes.length);
        return this.create(this._pieceTypes[idx].id);
    }
    
    // 创建特效棋子
    createEffect(effectName, options = {}) {
        const piece = options.color
            ? this.create(options.color)
            : new Piece({ id: 'effect', visual: { char: '', color: '#888' } });
        
        piece.effect = effectName;
        
        if (options.direction) piece.stateData.direction = options.direction;
        if (options.color) piece.stateData.color = options.color;
        if (options.extra) Object.assign(piece.stateData, options.extra);
        
        return piece;
    }
    
    // 从序列化数据创建
    deserialize(obj) {
        return Piece.deserialize(obj);
    }
    
    // 获取所有类型 id
    getAllTypeIds() {
        return this._pieceTypes.map(t => t.id);
    }
}

window.PieceFactory = PieceFactory;