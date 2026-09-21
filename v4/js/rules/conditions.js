// ==================== 内置条件 ====================

function registerBuiltinConditions(registries) {
    const C = registries.conditions;
    
    // ===== 形状匹配 =====
    C.register('shape', {
        meta: {
            label: '形状',
            description: '匹配的形状是某种类型',
            params: [
                {
                    name: 'type',
                    label: '形状类型',
                    type: 'enum',
                    options: [
                        { value: 'line', label: '直线' },
                        { value: 'square', label: '田字' },
                        { value: 'tshape', label: 'T形' },
                        { value: 'lshape', label: 'L形' },
                        { value: 'cross', label: '十字架' },
                        { value: 'bigT', label: '大T' }
                    ],
                    required: true
                },
                { name: 'minLength', label: '最小长度', type: 'number', default: null },
                { name: 'maxLength', label: '最大长度', type: 'number', default: null },
                { name: 'length', label: '精确长度', type: 'number', default: null },
                {
                    name: 'direction',
                    label: '方向',
                    type: 'enum',
                    options: [
                        { value: null, label: '任意' },
                        { value: 'horizontal', label: '水平' },
                        { value: 'vertical', label: '垂直' }
                    ],
                    default: null
                }
            ]
        },
        match: (params, data) => {
            const shapeResult = data.shapeResult || data.$shapeResult;
            if (!shapeResult) return false;
            
            if (shapeResult.shape !== params.type) return false;
            
            if (params.length !== null && params.length !== undefined && shapeResult.length !== params.length) {
                return false;
            }
            if (params.minLength !== null && params.minLength !== undefined && shapeResult.length < params.minLength) {
                return false;
            }
            if (params.maxLength !== null && params.maxLength !== undefined && shapeResult.length > params.maxLength) {
                return false;
            }
            if (params.direction && shapeResult.direction !== params.direction) return false;
            
            return true;
        }
    });
    
    // ===== 数量范围 =====
    C.register('count', {
        meta: {
            label: '数量',
            description: '匹配的棋子数量在范围内',
            params: [
                { name: 'min', label: '最小', type: 'number', default: null },
                { name: 'max', label: '最大', type: 'number', default: null }
            ]
        },
        match: (params, data) => {
            const count = data.count ?? data.matchCount ?? data.$shapeResult?.length ?? 0;
            if (params.min !== null && params.min !== undefined && count < params.min) return false;
            if (params.max !== null && params.max !== undefined && count > params.max) return false;
            return true;
        }
    });
    
    // ===== 有属性 =====
    C.register('hasAttr', {
        meta: {
            label: '有属性',
            description: '目标棋子有某个属性',
            params: [
                { name: 'attr', label: '属性名', type: 'string', required: true },
                { name: 'min', label: '最小值', type: 'number', default: 1 }
            ]
        },
        match: (params, data) => {
            const piece = data.piece || data.$piece;
            if (!piece) return false;
            return piece.getAttr(params.attr) >= (params.min || 1);
        }
    });
    
    // ===== 某颜色 =====
    C.register('color', {
        meta: {
            label: '颜色',
            description: '目标棋子的颜色是某个值',
            params: [
                { name: 'value', label: '颜色', type: 'elementRef', required: true }
            ]
        },
        match: (params, data) => {
            const color = data.color || data.$color || data.piece?.id;
            return color === params.value;
        }
    });
    
    // ===== 是某元素 =====
    C.register('isElement', {
        meta: {
            label: '是某元素',
            description: '目标棋子是某种元素',
            params: [
                { name: 'value', label: '元素', type: 'elementRef', required: true }
            ]
        },
        match: (params, data) => {
            const element = data.element || data.piece?.element || data.$elementId;
            return element === params.value;
        }
    });
    
    // ===== 方向 =====
    C.register('direction', {
        meta: {
            label: '方向',
            description: '目标的方向',
            params: [
                {
                    name: 'value',
                    label: '方向',
                    type: 'enum',
                    options: [
                        { value: 'horizontal', label: '水平' },
                        { value: 'vertical', label: '垂直' }
                    ],
                    required: true
                }
            ]
        },
        match: (params, data) => {
            const direction = data.direction || data.$direction;
            return direction === params.value;
        }
    });
    
    // ===== 相邻消除来源 =====
    C.register('adjacentSource', {
        meta: {
            label: '相邻消除来源',
            description: '相邻消除来自何种触发',
            params: [
                {
                    name: 'source',
                    label: '来源',
                    type: 'enum',
                    options: [
                        { value: 'match', label: '普通匹配' },
                        { value: 'effect', label: '特效爆炸' },
                        { value: 'any', label: '任意' }
                    ],
                    default: 'match'
                }
            ]
        },
        match: (params, data) => {
            if (params.source === 'any') return true;
            return data.source === params.source;
        }
    });
    
    // ===== 回合数 =====
    C.register('turn', {
        meta: {
            label: '回合',
            description: '当前回合数满足条件',
            params: [
                { name: 'every', label: '每 N 回合', type: 'number', default: null },
                { name: 'min', label: '最小', type: 'number', default: null },
                { name: 'max', label: '最大', type: 'number', default: null }
            ]
        },
        match: (params, data) => {
            const turn = data.turn ?? data.$turn ?? 0;
            if (params.every && turn % params.every !== 0) return false;
            if (params.min !== null && params.min !== undefined && turn < params.min) return false;
            if (params.max !== null && params.max !== undefined && turn > params.max) return false;
            return true;
        }
    });
    
    // ===== 与某元素交换 =====
    C.register('swappedWith', {
        meta: {
            label: '与某元素交换',
            description: '交换的对象是某元素',
            params: [
                { name: 'element', label: '元素', type: 'elementRef', required: true }
            ]
        },
        match: (params, data) => {
            const other = data.otherPiece || data.other;
            if (!other) return false;
            return other.element === params.element || other.id === params.element;
        }
    });
    
    // ===== 逻辑与 =====
    C.register('and', {
        meta: {
            label: '全部满足',
            description: '所有条件都满足',
            params: [
                { name: 'conditions', label: '条件列表', type: 'conditionList', required: true }
            ]
        },
        match: (params, data) => {
            const parser = window.__expressionParser__;
            if (!parser) return false;
            return params.conditions.every(c => parser.matchCondition(c, data));
        }
    });
    
    // ===== 逻辑或 =====
    C.register('or', {
        meta: {
            label: '任一满足',
            description: '任一条件满足即可',
            params: [
                { name: 'conditions', label: '条件列表', type: 'conditionList', required: true }
            ]
        },
        match: (params, data) => {
            const parser = window.__expressionParser__;
            if (!parser) return false;
            return params.conditions.some(c => parser.matchCondition(c, data));
        }
    });
    
    // ===== 逻辑非 =====
    C.register('not', {
        meta: {
            label: '不满足',
            description: '条件不满足',
            params: [
                { name: 'condition', label: '条件', type: 'condition', required: true }
            ]
        },
        match: (params, data) => {
            const parser = window.__expressionParser__;
            if (!parser) return true;
            return !parser.matchCondition(params.condition, data);
        }
    });
}