// ==================== 特效合成规则处理器 ====================

/**
 * 根据形状结果，决定生成什么特效
 * 这是引擎在 processMatches 时调用的核心函数
 */
function resolveCreationFromShape(game, shapeResult, matches) {
    if (!shapeResult) return null;
    
    const rules = game._creationRules || BUILTIN_CREATION_RULES;
    
    for (const rule of rules) {
        if (matchCreationRule(rule, shapeResult, matches)) {
            return {
                create: rule.create,
                place: rule.place || 'middle',
                preserve: rule.preserve || []
            };
        }
    }
    
    return null;
}

function matchCreationRule(rule, shapeResult, matches) {
    const when = rule.when || {};
    
    // 形状类型
    if (when.shape && shapeResult.shape !== when.shape) return false;
    
    // 精确长度
    if (when.length !== undefined && shapeResult.length !== when.length) return false;
    
    // 最小长度
    if (when.minLength !== undefined && shapeResult.length < when.minLength) return false;
    
    // 最大长度
    if (when.maxLength !== undefined && shapeResult.length > when.maxLength) return false;
    
    // 方向
    if (when.direction && shapeResult.direction !== when.direction) return false;
    
    return true;
}

/**
 * 根据规则计算特效生成位置
 */
function resolveCreationPosition(place, shapeResult, game) {
    const positions = shapeResult.positions;
    if (positions.length === 0) return null;
    
    switch (place) {
        case 'middle':
            return positions[Math.floor(positions.length / 2)];
        case 'intersection':
            return shapeResult.extra?.intersection || positions[0];
        case 'random':
            // ← 用 game.rng（如果没有，降级到 Math.random）
            const rng = game?.rng;
            const idx = rng ? rng.nextInt(positions.length) : Math.floor(Math.random() * positions.length);
            return positions[idx];
            //return positions[Math.floor(Math.random() * positions.length)];
        case 'first':
        default:
            return positions[0];
    }
}

/**
 * 根据 preserve 配置，提取要保留的属性
 */
function resolveCreationData(preserve, shapeResult, matches) {
    const data = {};
    for (const key of preserve) {
        if (key === 'direction') data.direction = shapeResult.direction;
        if (key === 'color') data.color = shapeResult.color;
    }
    return data;
}

window.resolveCreationFromShape = resolveCreationFromShape;
window.resolveCreationPosition = resolveCreationPosition;
window.resolveCreationData = resolveCreationData;