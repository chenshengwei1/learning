// ==================== 交换组合规则 ====================
//
// 双特效交换时，按顺序匹配规则，第一条匹配的生效。
// 最后一条是 fallback（各自触发）。
//
// context 变量：
//   $r1, $c1, $r2, $c2      —— 交换前双方位置
//   $piece1, $piece2        —— 交换后 (r1,c1) / (r2,c2) 的棋子
//   $row1, $row2            —— 交换前双方的行
//   $col1, $col2            —— 交换前双方的列
//   $lineRow, $lineCol      —— line 交换后的位置（line 主导）
//   $lineRow2, $lineCol2    —— 另一方的位置（用于 line+line 不同行/列）
//   $bombRow, $bombCol      —— bomb 交换后的位置

const BUILTIN_SWAP_RULES = [
    
    // ============================================================
    // line-h + line-h
    // ============================================================
    {
        id: 'line-h + line-h (same-row)',
        when: {
            p1Effect: 'line-horizontal',
            p2Effect: 'line-horizontal',
            condition: 'sameRow'
        },
        effect: {
            targets: [{ type: 'row', r: '$lineRow' }],
            damage: 2
        }
    },
    {
        id: 'line-h + line-h (diff-row)',
        when: {
            p1Effect: 'line-horizontal',
            p2Effect: 'line-horizontal',
            condition: 'diffRow'
        },
        effect: {
            targets: [
                { type: 'row', r: '$lineRow' },
                { type: 'row', r: '$lineRow2' }
            ],
            damage: 1
        }
    },
    
    // ============================================================
    // line-v + line-v
    // ============================================================
    {
        id: 'line-v + line-v (same-col)',
        when: {
            p1Effect: 'line-vertical',
            p2Effect: 'line-vertical',
            condition: 'sameCol'
        },
        effect: {
            targets: [{ type: 'col', c: '$lineCol' }],
            damage: 2
        }
    },
    {
        id: 'line-v + line-v (diff-col)',
        when: {
            p1Effect: 'line-vertical',
            p2Effect: 'line-vertical',
            condition: 'diffCol'
        },
        effect: {
            targets: [
                { type: 'col', c: '$lineCol' },
                { type: 'col', c: '$lineCol2' }
            ],
            damage: 1
        }
    },
    
    // ============================================================
    // line-h + line-v（十字）
    // ============================================================
    {
        id: 'line-h + line-v (cross)',
        when: {
            p1Effect: 'line-horizontal',
            p2Effect: 'line-vertical'
        },
        effect: {
            targets: [
                { type: 'row', r: '$lineRow' },
                { type: 'col', c: '$lineCol' }
            ],
            damage: 1
        }
    },
    {
        id: 'line-v + line-h (cross)',
        when: {
            p1Effect: 'line-vertical',
            p2Effect: 'line-horizontal'
        },
        effect: {
            targets: [
                { type: 'row', r: '$lineRow' },
                { type: 'col', c: '$lineCol' }
            ],
            damage: 1
        }
    },
    
    // ============================================================
    // line + bomb（三行三列）
    // ============================================================
    {
        id: 'line-h + bomb',
        when: {
            p1Effect: 'line-horizontal',
            p2Effect: 'bomb'
        },
        effect: {
            targets: [
                { type: 'row', r: '$bombRowOffset', offset: -1 },
                { type: 'row', r: '$bombRow' },
                { type: 'row', r: '$bombRowOffset', offset: 1 },
                { type: 'col', c: '$lineColOffset', offset: -1 },
                { type: 'col', c: '$lineCol' },
                { type: 'col', c: '$lineColOffset', offset: 1 }
            ],
            damage: 1
        }
    },
    {
        id: 'bomb + line-h',
        when: {
            p1Effect: 'bomb',
            p2Effect: 'line-horizontal'
        },
        effect: {
            targets: [
                { type: 'row', r: '$bombRowOffset', offset: -1 },
                { type: 'row', r: '$bombRow' },
                { type: 'row', r: '$bombRowOffset', offset: 1 },
                { type: 'col', c: '$lineColOffset', offset: -1 },
                { type: 'col', c: '$lineCol' },
                { type: 'col', c: '$lineColOffset', offset: 1 }
            ],
            damage: 1
        }
    },
    {
        id: 'line-v + bomb',
        when: {
            p1Effect: 'line-vertical',
            p2Effect: 'bomb'
        },
        effect: {
            targets: [
                { type: 'row', r: '$lineRowOffset', offset: -1 },
                { type: 'row', r: '$lineRow' },
                { type: 'row', r: '$lineRowOffset', offset: 1 },
                { type: 'col', c: '$bombColOffset', offset: -1 },
                { type: 'col', c: '$bombCol' },
                { type: 'col', c: '$bombColOffset', offset: 1 }
            ],
            damage: 1
        }
    },
    {
        id: 'bomb + line-v',
        when: {
            p1Effect: 'bomb',
            p2Effect: 'line-vertical'
        },
        effect: {
            targets: [
                { type: 'row', r: '$lineRowOffset', offset: -1 },
                { type: 'row', r: '$lineRow' },
                { type: 'row', r: '$lineRowOffset', offset: 1 },
                { type: 'col', c: '$bombColOffset', offset: -1 },
                { type: 'col', c: '$bombCol' },
                { type: 'col', c: '$bombColOffset', offset: 1 }
            ],
            damage: 1
        }
    },
    
    // ============================================================
    // bomb + bomb（5×5 范围）
    // ============================================================
    {
        id: 'bomb + bomb',
        when: {
            p1Effect: 'bomb',
            p2Effect: 'bomb'
        },
        effect: {
            targets: [{ type: 'area', r: '$r1', c: '$c1', radius: 2, diagonal: true }],
            damage: 1
        }
    },
    
    // ============================================================
    // rainbow + 任意
    // ============================================================
    {
        id: 'rainbow + line',
        when: {
            p1Effect: 'rainbow',
            p2Effect: ['line-horizontal', 'line-vertical']
        },
        effect: {
            targets: [{ type: 'all' }],
            damage: 1
        }
    },
    {
        id: 'line + rainbow',
        when: {
            p1Effect: ['line-horizontal', 'line-vertical'],
            p2Effect: 'rainbow'
        },
        effect: {
            targets: [{ type: 'all' }],
            damage: 1
        }
    },
    {
        id: 'rainbow + bomb',
        when: {
            p1Effect: 'rainbow',
            p2Effect: 'bomb'
        },
        effect: {
            targets: [{ type: 'all' }],
            damage: 1
        }
    },
    {
        id: 'bomb + rainbow',
        when: {
            p1Effect: 'bomb',
            p2Effect: 'rainbow'
        },
        effect: {
            targets: [{ type: 'all' }],
            damage: 1
        }
    },
    {
        id: 'rainbow + rainbow',
        when: {
            p1Effect: 'rainbow',
            p2Effect: 'rainbow'
        },
        effect: {
            targets: [{ type: 'all' }],
            damage: 1
        }
    },
    
    // ============================================================
    // fallback：各自触发各自效果
    // ============================================================
    {
        id: 'default',
        when: {},
        effect: {
            targets: 'each',
            damage: 1
        }
    }
];

window.BUILTIN_SWAP_RULES = BUILTIN_SWAP_RULES;