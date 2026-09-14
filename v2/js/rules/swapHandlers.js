// ==================== 交换处理器 ====================

function registerSwapHandlers(engine) {
    const game = engine.game;
    
    // ===== 双方同时触发 =====
    engine.registerSwapHandler('bothTrigger', async (game, p1, p2, pos1, pos2) => {
        const targets = new Set();
        
        if (p1.effect) {
            const t1 = await engine._triggerEffect(p1.effect, p1, pos1);
            for (const k of t1) targets.add(k);
        }
        if (p2.effect) {
            const t2 = await engine._triggerEffect(p2.effect, p2, pos2);
            for (const k of t2) targets.add(k);
        }
        
        return { targets, phases: [{ targets, damage: 1 }] };
    });
    
    // ===== 直线 + 爆炸：以爆炸为中心，十字爆炸 =====
    engine.registerSwapHandler('crossTrigger', async (game, p1, p2, pos1, pos2) => {
        // 找出爆炸的位置和直线的方向
        const bombPos = p1.effect === 'bomb' ? pos1 : pos2;
        const lineP = p1.effect === 'line' ? p1 : p2;
        const lineDir = lineP.stateData?.direction || 'horizontal';
        
        const targets = new Set();
        
        // 以爆炸位置为起点，向直线方向延伸整行/整列
        if (lineDir === 'horizontal') {
            // 爆炸点上下各延伸一行，整个水平方向
            for (let r = Math.max(0, bombPos.r - 1); r <= Math.min(game.rows - 1, bombPos.r + 1); r++) {
                for (let c = 0; c < game.cols; c++) {
                    targets.add(posToKey(r, c));
                }
            }
        } else {
            for (let c = Math.max(0, bombPos.c - 1); c <= Math.min(game.cols - 1, bombPos.c + 1); c++) {
                for (let r = 0; r < game.rows; r++) {
                    targets.add(posToKey(r, c));
                }
            }
        }
        
        return { targets, phases: [{ targets, damage: 1 }] };
    });
    
    // ===== 直线触发（四格 + 直线）：四格以直线效果触发 =====
    engine.registerSwapHandler('lineTrigger', async (game, p1, p2, pos1, pos2) => {
        const squarePos = p1.effect === 'square' ? pos1 : pos2;
        const lineP = p1.effect === 'line' ? p1 : p2;
        const dir = lineP.stateData?.direction || 'horizontal';
        
        const targets = new Set();
        
        if (dir === 'horizontal') {
            for (let c = 0; c < game.cols; c++) {
                targets.add(posToKey(squarePos.r, c));
            }
        } else {
            for (let r = 0; r < game.rows; r++) {
                targets.add(posToKey(r, squarePos.c));
            }
        }
        
        return { targets, phases: [{ targets, damage: 1 }] };
    });
    
    // ===== 爆炸 + 爆炸：范围升级 =====
    engine.registerSwapHandler('upgradeBomb', async (game, p1, p2, pos1, pos2) => {
        const targets = new Set();
        const midR = Math.round((pos1.r + pos2.r) / 2);
        const midC = Math.round((pos1.c + pos2.c) / 2);
        
        // 扩大范围：半径 2 的十字（不含斜角）
        for (let dr = -2; dr <= 2; dr++) {
            for (let dc = -2; dc <= 2; dc++) {
                if (Math.abs(dr) + Math.abs(dc) > 2) continue;
                const nr = midR + dr, nc = midC + dc;
                if (game.board.isInBounds(nr, nc)) {
                    targets.add(posToKey(nr, nc));
                }
            }
        }
        
        return { targets, phases: [{ targets, damage: 1 }] };
    });
    
    // ===== 魔力鸟 + 普通特效：同色棋子转化为该特效 =====
    engine.registerSwapHandler('convertAllOfColor', async (game, p1, p2, pos1, pos2) => {
        // 找出魔力鸟和另一个特效
        const rainbowP = p1.effect === 'rainbow' ? p1 : p2;
        const otherP = p1.effect === 'rainbow' ? p2 : p1;
        const otherPos = p1.effect === 'rainbow' ? pos2 : pos1;
        
        const otherEffect = otherP.effect;
        const color = otherP.id;
        
        // 将全屏同色棋子转化为该特效
        const targets = new Set();
        game.board.forEach((piece, r, c) => {
            if (piece && piece.id === color) {
                // 转化为特效
                piece.effect = otherEffect;
                piece.stateData = {
                    direction: otherEffect === 'line' 
                        ? (Math.random() > 0.5 ? 'horizontal' : 'vertical') 
                        : null,
                    color
                };
                targets.add(posToKey(r, c));
            }
        });
        
        // 触发这些特效
        const allTargets = new Set(targets);
        for (const key of targets) {
            const { r, c } = keyToPos(key);
            const piece = game.board.get(r, c);
            if (piece?.effect) {
                const effectDef = engine.getEffect(piece.effect);
                if (effectDef?.trigger) {
                    const t = engine.executeSelector(effectDef.trigger.targets, {
                        r, c, color, ...piece.stateData
                    });
                    for (const k of t) allTargets.add(k);
                }
            }
        }
        
        return { targets: allTargets, phases: [{ targets: allTargets, damage: 1 }] };
    });
    
    // ===== 魔力鸟 + 魔力鸟：全屏清除 =====
    engine.registerSwapHandler('screenClear', async (game, p1, p2, pos1, pos2) => {
        const targets = new Set();
        game.board.forEach((p, r, c) => {
            targets.add(posToKey(r, c));
        });
        return { targets, phases: [{ targets, damage: 1 }] };
    });
    
    // ===== 双鸟交换：先全屏，掉落后再全屏 =====
    engine.registerSwapHandler('doubleScreenClear', async (game, p1, p2, pos1, pos2) => {
        const all1 = new Set();
        game.board.forEach((p, r, c) => all1.add(posToKey(r, c)));
        
        // 第二阶段的 targets 使用函数延迟计算
        const all2Fn = () => {
            const s = new Set();
            game.board.forEach((p, r, c) => s.add(posToKey(r, c)));
            return s;
        };
        
        return {
            targets: all1,
            phases: [
                { targets: all1, damage: 1 },
                { targetsFn: all2Fn, damage: 1 }
            ]
        };
    });
    
    // ===== 神奇鸟 + 魔力鸟：先全屏，掉落后消除同色 =====
    engine.registerSwapHandler('screenClearAndConvert', async (game, p1, p2, pos1, pos2) => {
        const magicP = p1.effect === 'magicBird' ? p1 : p2;
        const color = magicP.id;
        
        const all1 = new Set();
        game.board.forEach((p, r, c) => all1.add(posToKey(r, c)));
        
        // 第二阶段：消除同色
        const colorTargetsFn = () => {
            const s = new Set();
            game.board.forEach((p, r, c) => {
                if (p && p.id === color) s.add(posToKey(r, c));
            });
            return s;
        };
        
        return {
            targets: all1,
            phases: [
                { targets: all1, damage: 1 },
                { targetsFn: colorTargetsFn, damage: 1 }
            ]
        };
    });
    
    // ===== 神奇鸟 + 普通特效：两种颜色转化为该特效 =====
    engine.registerSwapHandler('convertTwoColors', async (game, p1, p2, pos1, pos2) => {
        const magicP = p1.effect === 'magicBird' ? p1 : p2;
        const otherP = p1.effect === 'magicBird' ? p2 : p1;
        const otherPos = p1.effect === 'magicBird' ? pos2 : pos1;
        
        const magicColor = magicP.id;
        const otherEffect = otherP.effect;
        const otherColor = otherP.id;
        
        // 收集所有颜色
        const allColors = new Set();
        game.board.forEach((p) => {
            if (p && p.id !== magicColor) allColors.add(p.id);
        });
        
        // 随机选一种非 magicColor、非 otherColor 的颜色
        const candidates = Array.from(allColors).filter(c => c !== otherColor);
        const randomColor = candidates.length > 0 
            ? candidates[Math.floor(Math.random() * candidates.length)]
            : null;
        
        // 转化两种颜色为 otherEffect
        const targets = new Set();
        const colorsToConvert = [otherColor, randomColor].filter(Boolean);
        
        game.board.forEach((piece, r, c) => {
            if (piece && colorsToConvert.includes(piece.id)) {
                piece.effect = otherEffect;
                piece.stateData = {
                    direction: otherEffect === 'line'
                        ? (Math.random() > 0.5 ? 'horizontal' : 'vertical')
                        : null,
                    color: piece.id
                };
                targets.add(posToKey(r, c));
            }
        });
        
        // 触发转化后的特效
        const allTargets = new Set(targets);
        for (const key of targets) {
            const { r, c } = keyToPos(key);
            const piece = game.board.get(r, c);
            if (piece?.effect) {
                const effectDef = engine.getEffect(piece.effect);
                if (effectDef?.trigger) {
                    const t = engine.executeSelector(effectDef.trigger.targets, {
                        r, c, color: piece.id, ...piece.stateData
                    });
                    for (const k of t) allTargets.add(k);
                }
            }
        }
        
        return { targets: allTargets, phases: [{ targets: allTargets, damage: 1 }] };
    });
    
    // ===== 默认：各自触发 =====
    engine.registerSwapHandler('defaultTrigger', async (game, p1, p2, pos1, pos2) => {
        const targets = new Set();
        
        for (const [p, pos] of [[p1, pos1], [p2, pos2]]) {
            if (!p?.effect) continue;
            const effectDef = engine.getEffect(p.effect);
            if (!effectDef?.trigger) continue;
            const t = engine.executeSelector(effectDef.trigger.targets, {
                r: pos.r, c: pos.c,
                color: p.stateData?.color || p.id,
                ...p.stateData
            });
            for (const k of t) targets.add(k);
        }
        
        return { targets, phases: [{ targets, damage: 1 }] };
    });
}