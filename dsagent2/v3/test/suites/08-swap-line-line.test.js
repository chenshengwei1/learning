// 测试双特效交换 line-h + line-v（十字）

const { createTestGame, setupBoard, setEffect, doSwap, snapshotBoard } = require('../harness');
const { assert, assertGreaterThan } = require('../assertions');

module.exports = async function() {
    console.log('\n--- 测试 双特效交换 line-h + line-v ---');
    
    const game = createTestGame();
    game.setMode('game');
    
    setupBoard(game, [
        [3, 3, 'fox'],
        [3, 4, 'owl'],
    ]);
    
    setEffect(game, 3, 3, 'line-horizontal');
    setEffect(game, 3, 4, 'line-vertical');
    
    const before = snapshotBoard(game);
    await doSwap(game, 3, 3, 3, 4);
    const after = snapshotBoard(game);
    
    const scoreGained = after.score - before.score;
    assertGreaterThan(scoreGained, 100, `分数增加 > 100（实际 ${scoreGained}）`);
};