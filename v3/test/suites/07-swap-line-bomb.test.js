// 测试双特效交换 line-h + bomb

const { createTestGame, setupBoard, setEffect, doSwap, snapshotBoard } = require('../harness');
const { assert, assertGreaterThan, assertEqual } = require('../assertions');

module.exports = async function() {
    console.log('\n--- 测试 双特效交换 line-h + bomb ---');
    
    const game = createTestGame();
    game.setMode('game');
    
    setupBoard(game, [
        [3, 3, 'fox'],
        [3, 4, 'owl'],
    ]);
    
    setEffect(game, 3, 3, 'line-horizontal');
    setEffect(game, 3, 4, 'bomb');
    
    const before = snapshotBoard(game);
    await doSwap(game, 3, 3, 3, 4);
    const after = snapshotBoard(game);
    
    assertGreaterThan(after.score, before.score, '分数增加');
    assertEqual(after.movesLeft, before.movesLeft - 1, '步数 -1');
    
    const scoreGained = after.score - before.score;
    assert(scoreGained >= 150, `分数增加 >= 150（实际 ${scoreGained}）`);
};