/**
 * 匹配规则类
 * 负责检测棋盘上的匹配
 */
class MatchRules {
    /**
     * 查找所有匹配
     */
    static findMatches(board) {
        const matches = [];
        const matched = new Set();

        // 水平匹配
        for (let row = 0; row < board.length; row++) {
            for (let col = 0; col < board[row].length - 2; col++) {
                if (board[row][col] &&
                    board[row][col + 1] &&
                    board[row][col + 2] &&
                    board[row][col].type === board[row][col + 1].type &&
                    board[row][col + 1].type === board[row][col + 2].type) {

                    const key1 = `${row},${col}`;
                    const key2 = `${row},${col + 1}`;
                    const key3 = `${row},${col + 2}`;

                    if (!matched.has(key1) && !matched.has(key2) && !matched.has(key3)) {
                        matches.push({
                            type: board[row][col].type,
                            positions: [
                                { row, col },
                                { row, col: col + 1 },
                                { row, col: col + 2 }
                            ]
                        });
                        matched.add(key1);
                        matched.add(key2);
                        matched.add(key3);
                    }
                }
            }
        }

        // 垂直匹配
        for (let col = 0; col < board[0].length; col++) {
            for (let row = 0; row < board.length - 2; row++) {
                if (board[row][col] &&
                    board[row + 1][col] &&
                    board[row + 2][col] &&
                    board[row][col].type === board[row + 1][col].type &&
                    board[row + 1][col].type === board[row + 2][col].type) {

                    const key1 = `${row},${col}`;
                    const key2 = `${row + 1},${col}`;
                    const key3 = `${row + 2},${col}`;

                    if (!matched.has(key1) && !matched.has(key2) && !matched.has(key3)) {
                        matches.push({
                            type: board[row][col].type,
                            positions: [
                                { row, col },
                                { row: row + 1, col },
                                { row: row + 2, col }
                            ]
                        });
                        matched.add(key1);
                        matched.add(key2);
                        matched.add(key3);
                    }
                }
            }
        }

        return matches;
    }
}
