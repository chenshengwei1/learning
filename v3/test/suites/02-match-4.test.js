// 测试 4 消（生成 line-horizontal）

const { createTestGame, setupBoard, doSwap, snapshotBoard } = require('../harness');
const { assert, assertGreaterThan } = require('../assertions');

module.exports = async function() {
    console.log('\n--- 测试 4 消 ---');
    
    const game = createTestGame();
    game.setMode('game');
    
    setupBoard(game, [
        [0, 2, 'fox'],
        [1, 0, 'fox'],
        [1, 1, 'fox'],
        [1, 2, 'cat'],
        [1, 3, 'fox'],
        [1, 4, 'cat'],
    ]);
    
    const before = snapshotBoard(game);
    await doSwap(game, 0, 2, 1, 2);
    const after = snapshotBoard(game);
    
    assertGreaterThan(after.score, before.score, '分数增加');
    
    const hasLineEffect = after.grid.some(row => 
        row.some(cell => cell && cell.effect === 'line-horizontal')
    );
    assert(hasLineEffect, '生成 line-horizontal 特效');
};