// ==================== Registries 统一入口 ====================

class Registries {
    constructor() {
        this.actions = new ActionRegistry();
        this.events = new EventRegistry();
        this.selectors = new SelectorRegistry();
        this.conditions = new ConditionRegistry();
        this.elements = new ElementRegistry();
        this.goals = new GoalRegistry();
    }
    
    /**
     * 获取所有元数据（用于生成表单）
     */
    getAllMeta() {
        return {
            actions: this.actions.getAllMeta(),
            events: this.events.getAllMeta(),
            selectors: this.selectors.getAllMeta(),
            conditions: this.conditions.getAllMeta(),
            goals: this.goals.getAllMeta(),
            elementCategories: Object.values(ELEMENT_CATEGORIES)
        };
    }
    
    clearAll() {
        this.actions.clear();
        this.events.clear();
        this.selectors.clear();
        this.conditions.clear();
        this.elements.clear();
        this.goals.clear();
    }
}

window.Registries = Registries;