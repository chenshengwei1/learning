// 测试 3 消

const { createTestGame, setupBoard, doSwap, snapshotBoard } = require('../harness');
const { assert, assertGreaterThan, assertEqual } = require('../assertions');

module.exports = async function() {
    console.log('\n--- 测试 3 消 ---');
    
    const game = createTestGame();
    game.setMode('game');
    
    setupBoard(game, [
        [0, 0, 'fox'],
        [0, 1, 'fox'],
        [0, 2, 'cat'],
        [0, 3, 'fox'],
    ]);
    
    const before = snapshotBoard(game);
    
    await doSwap(game, 0, 2, 0, 3);
    
    const after = snapshotBoard(game);
    
    assertGreaterThan(after.score, before.score, '分数增加');
    assertEqual(after.movesLeft, before.movesLeft - 1, '步数 -1');
};