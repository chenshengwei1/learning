// ==================== 特效规则定义 ====================

function registerEffects(engine) {
    
    // ===== 直线特效 =====
    engine.registerEffect('line', {
        visual: {
            char: '↔️',
            color: null
        },
        create: {
            when: condition.shape('line').length(4),
            place: 'middle',
            direction: '$shapeDirection',
            color: '$color'
        },
        trigger: {
            targets: (board, ctx) => Selector.union(
                Selector.row(ctx.r),
                Selector.col(ctx.c)
            ),
            damage: 1
        },
        swap: {
            'line': 'bothTrigger',
            'bomb': 'crossTrigger',
            'rainbow': 'convertAllOfColor',
            'magicBird': 'convertTwoColors'
        }
    });
    
    // ===== 爆炸特效（T/L 形 5 连） =====
    engine.registerEffect('bomb', {
        visual: {
            char: '💣',
            color: null
        },
        create: {
            when: condition.shape('tshape').or(condition.shape('lshape')).length(5),
            place: 'intersection',
            color: '$color'
        },
        trigger: {
            targets: (board, ctx) => Selector.area(ctx.r, ctx.c, 1, { diagonal: false }),
            damage: 1
        },
        swap: {
            'line': 'crossTrigger',
            'bomb': 'upgradeBomb',
            'rainbow': 'convertAllOfColor',
            'magicBird': 'convertTwoColors'
        }
    });
    
    // ===== 四格特效（田字） =====
    engine.registerEffect('square', {
        visual: {
            char: '✨',
            color: null
        },
        create: {
            when: condition.shape('square').length(4),
            place: 'middle',
            color: '$color'
        },
        trigger: {
            targets: (board, ctx) => Selector.area(ctx.r, ctx.c, 1, { diagonal: false }),
            damage: 2  // 四格特效伤害更高
        },
        swap: {
            'line': 'lineTrigger',
            'bomb': 'bothTrigger',
            'square': 'bothTrigger',
            'rainbow': 'convertAllOfColor',
            'magicBird': 'convertTwoColors'
        }
    });
    
    // ===== 魔力鸟（5 连直线） =====
    engine.registerEffect('rainbow', {
        visual: {
            char: '🌈',
            color: null
        },
        create: {
            when: condition.shape('line').minLength(5),
            place: 'middle',
            color: null  // 无颜色
        },
        trigger: {
            targets: (board, ctx) => {
                // 无颜色时清除全屏
                if (!ctx.color) return Selector.all()(board, ctx);
                return Selector.allOfColor(ctx.color)(board, ctx);
            },
            damage: 1
        },
        swap: {
            'line': 'convertAllOfColor',
            'bomb': 'convertAllOfColor',
            'square': 'convertAllOfColor',
            'rainbow': 'screenClear',
            'magicBird': 'screenClearAndConvert'
        }
    });
    
    // ===== 神奇鸟（十字架 6 连） =====
    engine.registerEffect('magicBird', {
        visual: {
            char: '🐦',
            color: null
        },
        create: {
            when: condition.shape('cross').minLength(6),
            place: 'intersection',
            color: '$color'
        },
        trigger: {
            targets: (board, ctx) => Selector.allOfColor(ctx.color)(board, ctx),
            damage: 1
        },
        swap: {
            'line': 'convertTwoColors',
            'bomb': 'convertTwoColors',
            'square': 'convertTwoColors',
            'rainbow': 'screenClearAndConvert',
            'magicBird': 'doubleScreenClear'
        }
    });
}