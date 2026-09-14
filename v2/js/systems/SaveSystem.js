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
            if (!raw) return null;
            return JSON.parse(raw);
        } catch (e) {
            console.error('加载配置失败:', e);
            return null;
        }
    }
    
    clearConfig() {
        try {
            localStorage.removeItem(STORAGE_KEYS.config);
        } catch {}
    }
    
    // ===== 关卡 =====
    
    saveLevel(level) {
        try {
            const levels = this.listLevels();
            const idx = levels.findIndex(l => l.name === level.name);
            if (idx >= 0) {
                levels[idx] = level;
            } else {
                levels.unshift(level);
            }
            const trimmed = levels.slice(0, LIMITS.MAX_LEVELS);
            localStorage.setItem(STORAGE_KEYS.levels, JSON.stringify(trimmed));
            return true;
        } catch (e) {
            console.error('保存关卡失败:', e);
            return false;
        }
    }
    
    listLevels() {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.levels);
            if (!raw) return [];
            const levels = JSON.parse(raw);
            return Array.isArray(levels) ? levels : [];
        } catch {
            return [];
        }
    }
    
    loadLevel(name) {
        const levels = this.listLevels();
        return levels.find(l => l.name === name) || null;
    }
    
    deleteLevel(name) {
        try {
            const levels = this.listLevels().filter(l => l.name !== name);
            localStorage.setItem(STORAGE_KEYS.levels, JSON.stringify(levels));
            return true;
        } catch {
            return false;
        }
    }
}

window.SaveSystem = SaveSystem;