// 测试 L 形

const { createTestGame, setupBoard, doSwap, snapshotBoard } = require('../harness');
const { assert, assertGreaterThan } = require('../assertions');

module.exports = async function() {
    console.log('\n--- 测试 L 形 ---');
    
    const game = createTestGame();
    game.setMode('game');
    
    setupBoard(game, [
        [0, 0, 'fox'], [1, 0, 'fox'], [2, 0, 'fox'],
        [0, 1, 'fox'], [0, 2, 'cat'],
        [0, 3, 'fox'],
    ]);
    
    const before = snapshotBoard(game);
    await doSwap(game, 0, 2, 0, 3);
    const after = snapshotBoard(game);
    
    assertGreaterThan(after.score, before.score, '分数增加');
    
    const hasBomb = after.grid.some(row => 
        row.some(cell => cell && cell.effect === 'bomb')
    );
    assert(hasBomb, '生成 bomb 特效');
};