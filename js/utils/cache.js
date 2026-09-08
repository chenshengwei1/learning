/**
 * 缓存工具
 * 封装 localStorage 操作
 */
const Cache = {
    /**
     * 获取缓存
     */
    get(key) {
        try {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : null;
        } catch (e) {
            console.warn('Cache get error:', e);
            return null;
        }
    },

    /**
     * 设置缓存
     */
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.warn('Cache set error:', e);
        }
    },

    /**
     * 删除缓存
     */
    remove(key) {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.warn('Cache remove error:', e);
        }
    },

    /**
     * 清空所有缓存
     */
    clear() {
        try {
            localStorage.clear();
        } catch (e) {
            console.warn('Cache clear error:', e);
        }
    }
};
