// ==================== SaveSystem 存档系统 ====================

class SaveSystem {
    saveConfig(config) {
        try {
            localStorage.setItem(STORAGE_KEYS.config, JSON.stringify(config));
        } catch (e) {
            console.error('保存配置失败:', e);
        }
    }
    
    loadConfig() {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.config);
            return raw ? JSON.parse(raw) : null;
        } catch { return null; }
    }
    
    saveLevels(levels) {
        try {
            localStorage.setItem(STORAGE_KEYS.levels, JSON.stringify(levels));
        } catch {}
    }
    
    loadLevels() {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.levels);
            const levels = raw ? JSON.parse(raw) : [];
            return Array.isArray(levels) ? levels : [];
        } catch { return []; }
    }
    
    saveElements(elements) {
        try {
            localStorage.setItem(STORAGE_KEYS.elements, JSON.stringify(elements));
        } catch {}
    }
    
    loadElements() {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.elements);
            return raw ? JSON.parse(raw) : null;
        } catch { return null; }
    }
}

window.SaveSystem = SaveSystem;