// ==================== 内置词统一注册 ====================

function registerAllBuiltins(registries) {
    registerBuiltinSelectors(registries);
    registerBuiltinConditions(registries);
    registerBuiltinActions(registries);
    registerBuiltinEvents(registries);
    registerBuiltinGoals(registries);
    
    console.log('✅ 内置词表注册完成');
    console.log('   选择器:', registries.selectors.getAllMeta().length);
    console.log('   条件:', registries.conditions.getAllMeta().length);
    console.log('   动作:', registries.actions.getAllMeta().length);
    console.log('   事件:', registries.events.getAllMeta().length);
    console.log('   目标:', registries.goals.getAllMeta().length);
}