// test/assertions.js
// 断言库：收集通过/失败统计

(function(global) {
    'use strict';
    
    const isNode = typeof module !== 'undefined' && module.exports;
    
    let passCount = 0;
    let failCount = 0;
    const failures = [];
    
    function assert(condition, message) {
        if (condition) {
            passCount++;
            console.log(`  ✅ ${message}`);
            return true;
        } else {
            failCount++;
            failures.push(message);
            console.log(`  ❌ ${message}`);
            return false;
        }
    }
    
    function assertEqual(actual, expected, message) {
        const ok = JSON.stringify(actual) === JSON.stringify(expected);
        if (ok) {
            passCount++;
            console.log(`  ✅ ${message}`);
            return true;
        } else {
            failCount++;
            failures.push(message);
            console.log(`  ❌ ${message}`);
            console.log(`     期望: ${JSON.stringify(expected)}`);
            console.log(`     实际: ${JSON.stringify(actual)}`);
            return false;
        }
    }
    
    function assertNotEqual(actual, expected, message) {
        const ok = JSON.stringify(actual) !== JSON.stringify(expected);
        if (ok) {
            passCount++;
            console.log(`  ✅ ${message}`);
            return true;
        } else {
            failCount++;
            failures.push(message);
            console.log(`  ❌ ${message}`);
            console.log(`     不应等于: ${JSON.stringify(expected)}`);
            return false;
        }
    }
    
    function assertGreaterThan(actual, expected, message) {
        const ok = actual > expected;
        if (ok) {
            passCount++;
            console.log(`  ✅ ${message}`);
            return true;
        } else {
            failCount++;
            failures.push(message);
            console.log(`  ❌ ${message}`);
            console.log(`     期望: > ${expected}`);
            console.log(`     实际: ${actual}`);
            return false;
        }
    }
    
    function assertContains(haystack, needle, message) {
        const ok = haystack.includes(needle);
        if (ok) {
            passCount++;
            console.log(`  ✅ ${message}`);
            return true;
        } else {
            failCount++;
            failures.push(message);
            console.log(`  ❌ ${message}`);
            console.log(`     应包含: ${needle}`);
            console.log(`     实际: ${JSON.stringify(haystack)}`);
            return false;
        }
    }
    
    function resetCounters() {
        passCount = 0;
        failCount = 0;
        failures.length = 0;
    }
    
    function getResults() {
        return { passCount, failCount, failures: [...failures] };
    }
    
    const api = {
        assert, assertEqual, assertNotEqual,
        assertGreaterThan, assertContains,
        resetCounters, getResults,
    };
    
    if (isNode) {
        module.exports = api;
    } else {
        global.__testAssertions = api;
    }
    
})(typeof globalThis !== 'undefined' ? globalThis : this);