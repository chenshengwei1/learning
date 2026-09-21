// ==================== 内置目标 ====================

function registerBuiltinGoals(registries) {
    const G = registries.goals;
    
    // ===== 分数目标 =====
    G.register('score', {
        meta: {
            label: '分数目标',
            description: '达到指定分数',
            params: [
                { name: 'value', label: '目标分数', type: 'number', required: true, min: 0 }
            ]
        },
        check: (game, config) => {
            return game.score >= config.value;
        },
        progress: (game, config) => {
            return { current: game.score, target: config.value };
        }
    });
    
    // ===== 收集目标 =====
    G.register('collect', {
        meta: {
            label: '收集目标',
            description: '收集指定数量的目标物',
            params: [
                { name: 'element', label: '目标物类型', type: 'elementRef', default: null },
                { name: 'count', label: '数量', type: 'number', default: 1, min: 1 }
            ]
        },
        check: (game, config) => {
            const count = game.collectedCounts?.[config.element] || 0;
            return count >= config.count;
        },
        progress: (game, config) => {
            const count = game.collectedCounts?.[config.element] || 0;
            return { current: count, target: config.count };
        }
    });
    
    // ===== 清空目标（收集所有）=====
    G.register('collectAll', {
        meta: {
            label: '清空目标',
            description: '收集所有目标物',
            params: [
                { name: 'element', label: '目标物类型', type: 'elementRef', default: null }
            ]
        },
        check: (game, config) => {
            if (!config.element) {
                return game.board.targets.length === 0;
            }
            return game.board.getTargetsByElement(config.element).length === 0;
        },
        progress: (game, config) => {
            const initial = game.initialTargetCount || 1;
            const current = config.element 
                ? game.board.getTargetsByElement(config.element).length
                : game.board.targets.length;
            return { current: initial - current, target: initial };
        }
    });
    
    // ===== 消除特定棋子目标 =====
    G.register('eliminate', {
        meta: {
            label: '消除目标',
            description: '消除指定数量的某种棋子',
            params: [
                { name: 'element', label: '棋子类型', type: 'elementRef', required: true },
                { name: 'count', label: '数量', type: 'number', default: 1, min: 1 }
            ]
        },
        check: (game, config) => {
            const count = game.elimCounts?.[config.element] || 0;
            return count >= config.count;
        },
        progress: (game, config) => {
            const count = game.elimCounts?.[config.element] || 0;
            return { current: count, target: config.count };
        }
    });
    
    // ===== 步数目标 =====
    G.register('movesLeft', {
        meta: {
            label: '剩余步数',
            description: '步数耗尽时失败',
            params: [
                { name: 'min', label: '最少步数', type: 'number', default: 0 }
            ]
        },
        check: (game, config) => {
            return game.movesLeft <= (config.min || 0);
        }
    });
    
    // ===== 时间目标 =====
    G.register('timeLeft', {
        meta: {
            label: '剩余时间',
            description: '时间耗尽时失败',
            params: [
                { name: 'min', label: '最少时间', type: 'number', default: 0 }
            ]
        },
        check: (game, config) => {
            return game.timeLeft <= (config.min || 0);
        }
    });
    
    // ===== 全部达成（多目标）=====
    G.register('all', {
        meta: {
            label: '全部达成',
            description: '所有子目标都达成',
            params: [
                { name: 'goals', label: '目标列表', type: 'goalList', required: true }
            ]
        },
        check: (game, config) => {
            for (const subGoal of config.goals || []) {
                const goalDef = window.__registries__?.goals?.get(subGoal.type);
                if (!goalDef) continue;
                if (!goalDef.check(game, subGoal)) return false;
            }
            return true;
        }
    });
    
    // ===== 任一达成 =====
    G.register('any', {
        meta: {
            label: '任一达成',
            description: '任一子目标达成即可',
            params: [
                { name: 'goals', label: '目标列表', type: 'goalList', required: true }
            ]
        },
        check: (game, config) => {
            for (const subGoal of config.goals || []) {
                const goalDef = window.__registries__?.goals?.get(subGoal.type);
                if (!goalDef) continue;
                if (goalDef.check(game, subGoal)) return true;
            }
            return false;
        }
    });
}