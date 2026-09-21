// ==================== EventQueue 事件队列 ====================

class EventQueue {
    constructor() {
        this.queue = [];
        this.processing = false;
    }
    
    /**
     * 入队
     */
    push(event) {
        this.queue.push({
            ...event,
            timestamp: Date.now()
        });
    }
    
    /**
     * 出队
     */
    shift() {
        return this.queue.shift();
    }
    
    /**
     * 获取队列长度
     */
    get length() {
        return this.queue.length;
    }
    
    /**
     * 清空
     */
    clear() {
        this.queue = [];
    }
    
    /**
     * 是否有待处理事件
     */
    hasPending() {
        return this.queue.length > 0;
    }
    
    /**
     * 获取当前所有事件（不出队）
     */
    peekAll() {
        return [...this.queue];
    }
}

window.EventQueue = EventQueue;