// test/run-all.js
// 在 Node.js 里跑所有测试

const fs = require('fs');
const path = require('path');
const assertions = require('./assertions');

const suitesDir = path.join(__dirname, 'suites');
const suiteFiles = fs.readdirSync(suitesDir)
    .filter(f => f.endsWith('.test.js'))
    .sort();

async function main() {
    let totalPass = 0;
    let totalFail = 0;
    const allFailures = [];
    
    console.log('========================================');
    console.log('🧪 测试套件');
    console.log('========================================');
    
    for (const file of suiteFiles) {
        console.log(`\n========== ${file} ==========`);
        assertions.resetCounters();
        
        try {
            const testFn = require(path.join(suitesDir, file));
            await testFn();
        } catch (e) {
            console.log(`  ❌ 测试文件崩溃: ${e.message}`);
            console.log(e.stack);
            totalFail++;
            continue;
        }
        
        const { passCount, failCount, failures } = assertions.getResults();
        totalPass += passCount;
        totalFail += failCount;
        allFailures.push(...failures.map(f => `${file}: ${f}`));
    }
    
    console.log('\n========================================');
    console.log('📊 测试结果');
    console.log('========================================');
    console.log(`✅ 通过: ${totalPass}`);
    console.log(`❌ 失败: ${totalFail}`);
    
    if (totalFail > 0) {
        console.log('\n失败列表:');
        allFailures.forEach(f => console.log(`  - ${f}`));
        process.exit(1);
    } else {
        console.log('\n🎉 全部通过！');
        process.exit(0);
    }
}

main().catch(e => {
    console.error('测试运行失败:', e);
    process.exit(1);
});