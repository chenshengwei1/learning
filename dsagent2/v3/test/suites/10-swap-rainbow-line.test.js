// 测试双特效交换 rainbow + line

const { createTestGame, setupBoard, setEffect, doSwap, snapshotBoard } = require('../harness');
const { assert, assertGreaterThan, assertEqual } = require('../assertions');

module.exports = async function() {
    console.log('\n--- 测试 双特效交换 rainbow + line ---');
    
    const game = createTestGame();
    game.setMode('game');
    
    setupBoard(game, [
        [3, 3, 'fox'],
        [3, 4, 'owl'],
    ]);
    
    setEffect(game, 3, 3, 'rainbow');
    setEffect(game, 3, 4, 'line-horizontal');
    
    const before = snapshotBoard(game);
    await doSwap(game, 3, 3, 3, 4);
    const after = snapshotBoard(game);
    
    const scoreGained = after.score - before.score;
    assertGreaterThan(scoreGained, 1000, `分数增加 > 1000（实际 ${scoreGained}）`);
    assertEqual(after.movesLeft, before.movesLeft - 1, '步数 -1');
};