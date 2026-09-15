// 测试页面元素一致性

const { assert } = require('../assertions');

module.exports = async function() {
    console.log('\n--- 测试页面元素一致性 ---');
    
    if (typeof document === 'undefined') {
        console.log('  ⚠️ 非浏览器环境，跳过');
        return;
    }
    
    // 需要游戏页面已加载
    const game = window.__gameEngine;
    const checker = window.__pageChecker;
    
    if (!game) {
        console.log('  ⚠️ 游戏未加载（__gameEngine 未定义），跳过');
        return;
    }
    if (!checker) {
        console.log('  ⚠️ 页面检测未加载（__pageChecker 未定义），跳过');
        return;
    }
    
    // 场景 1：初始状态
    let result = checker.checkPageConsistency(game);
    checker.printCheckResult(result);
    assert(result.consistent, '初始状态：页面元素一致');
    
    // 场景 2：交换后
    await game.swap(0, 0, 0, 1);
    result = checker.checkPageConsistency(game);
    checker.printCheckResult(result);
    assert(result.consistent, '交换后：页面元素一致');
};