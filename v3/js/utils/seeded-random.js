// js/utils/seeded-random.js
// ==================== 可重现的随机数生成器 ====================

(function() {
    'use strict';
    
    class SeededRandom {
        constructor(seed = 12345) {
            this.seed = seed;
            this._state = seed;
        }
        
        /**
         * 返回 [0, 1) 的随机数（可重现）
         * mulberry32 算法
         */
        next() {
            this._state |= 0;
            this._state = (this._state + 0x6D2B79F5) | 0;
            let t = this._state;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        }
        
        /**
         * 返回 [0, max) 的整数
         */
        nextInt(max) {
            return Math.floor(this.next() * max);
        }
        
        /**
         * 重置为指定种子
         */
        reset(seed) {
            this.seed = seed;
            this._state = seed;
        }
        
        /**
         * 保存当前状态（用于回退）
         */
        saveState() {
            return this._state;
        }
        
        /**
         * 恢复状态
         */
        restoreState(state) {
            this._state = state;
        }
    }
    
    window.SeededRandom = SeededRandom;
})();