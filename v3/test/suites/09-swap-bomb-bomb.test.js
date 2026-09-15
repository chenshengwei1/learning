// 测试双特效交换 bomb + bomb

const { createTestGame, setupBoard, setEffect, doSwap, snapshotBoard } = require('../harness');
const { assert, assertGreaterThan } = require('../assertions');

module.exports = async function() {
    console.log('\n--- 测试 双特效交换 bomb + bomb ---');
    
    const game = createTestGame();
    game.setMode('game');
    
    setupBoard(game, [
        [3, 3, 'fox'],
        [3, 4, 'owl'],
    ]);
    
    setEffect(game, 3, 3, 'bomb');
    setEffect(game, 3, 4, 'bomb');
    
    const before = snapshotBoard(game);
    await doSwap(game, 3, 3, 3, 4);
    const after = snapshotBoard(game);
    
    const scoreGained = after.score - before.score;
    assertGreaterThan(scoreGained, 200, `分数增加 > 200（实际 ${scoreGained}）`);
};