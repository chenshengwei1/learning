// 测试田字

const { createTestGame, setupBoard, doSwap, snapshotBoard } = require('../harness');
const { assert, assertGreaterThan } = require('../assertions');

module.exports = async function() {
    console.log('\n--- 测试田字 ---');
    
    const game = createTestGame();
    game.setMode('game');
    
    setupBoard([
        [0, 3, 'fox'], [0, 4, 'fox'], [0, 5, 'bear'],   // ← 新增 (0,5) = bear
        [1, 3, 'fox'], [1, 4, 'cat'], [1, 5, 'fox'],
        [2, 4, 'bear'],                                  // ← 新增 (2,4) = bear
    ]);
    
    const before = snapshotBoard(game);
    await doSwap(game, 1, 4, 1, 5);
    const after = snapshotBoard(game);
    
    assertGreaterThan(after.score, before.score, '分数增加');
    
    const hasSquare = after.grid.some(row => 
        row.some(cell => cell && cell.effect === 'square-effect')
    );
    assert(hasSquare, '生成 square-effect 特效');
};