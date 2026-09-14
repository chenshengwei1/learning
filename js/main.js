// ==================== 主入口 ====================



// 创建游戏引擎实例
const game = new GameEngine();

// 加载配置
const sc = game.configManager.loadConfig();
game.applyConfig(sc);

// 初始化游戏
game.init();

// 设置默认模式为管理员
game.setMode('admin');

// 暴露到全局（用于调试和HTML事件）
window.__gameEngine = game;

console.log('🍬 糖果消消乐 v5 已启动！');
console.log('📐 棋盘:', game.rows, 'x', game.cols);
console.log('🎯 匹配规则:', game.matchRules.map(r => r.name).join(', '));
console.log('💥 爆炸规则:', game.config.explodeRules);