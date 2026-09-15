// 测试 5 消（生成 rainbow）

const { createTestGame, setupBoard, doSwap, snapshotBoard } = require('../harness');
const { assert, assertGreaterThan } = require('../assertions');

module.exports = async function() {
    console.log('\n--- 测试 5 消 ---');
    
    const game = createTestGame();
    game.setMode('game');
    
    setupBoard(game, [
        [0, 2, 'fox'],
        [1, 0, 'fox'],
        [1, 1, 'fox'],
        [1, 2, 'cat'],
        [1, 3, 'fox'],
        [1, 4, 'fox'],
        [1, 5, 'cat'],
        [1, 6, 'cat'],
        [1, 7, 'cat'],
    ]);
    
    const before = snapshotBoard(game);
    await doSwap(game, 0, 2, 1, 2);
    const after = snapshotBoard(game);
    
    assertGreaterThan(after.score, before.score, '分数增加');
    
    const hasRainbow = after.grid.some(row => 
        row.some(cell => cell && cell.effect === 'rainbow')
    );
    assert(hasRainbow, '生成 rainbow 特效');
};