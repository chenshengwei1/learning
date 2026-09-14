// ==================== EventBus 事件总线 ====================

class EventBus {
    constructor() {
        this.listeners = new Map();
    }
    
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
        return () => this.off(event, callback);
    }
    
    once(event, callback) {
        const wrapper = async (data) => {
            this.off(event, wrapper);
            await callback(data);
        };
        return this.on(event, wrapper);
    }
    
    off(event, callback) {
        if (!this.listeners.has(event)) return;
        const arr = this.listeners.get(event);
        const idx = arr.indexOf(callback);
        if (idx >= 0) arr.splice(idx, 1);
    }
    
    async emit(event, data) {
        if (!this.listeners.has(event)) return;
        const callbacks = [...this.listeners.get(event)];
        for (const cb of callbacks) {
            try {
                await cb(data);
            } catch (e) {
                console.error(`EventBus error on "${event}":`, e);
            }
        }
    }
    
    clear(event) {
        if (event) {
            this.listeners.delete(event);
        } else {
            this.listeners.clear();
        }
    }
}

window.EventBus = EventBus;