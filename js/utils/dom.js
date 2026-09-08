/**
 * DOM 工具
 */
const DOM = {
    /**
     * 获取元素
     */
    $(selector, parent = document) {
        return parent.querySelector(selector);
    },

    /**
     * 获取所有元素
     */
    $$(selector, parent = document) {
        return Array.from(parent.querySelectorAll(selector));
    },

    /**
     * 创建元素
     */
    create(tag, className = '', html = '') {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (html) el.innerHTML = html;
        return el;
    },

    /**
     * 移除元素
     */
    remove(element) {
        if (element && element.parentNode) {
            element.parentNode.removeChild(element);
        }
    },

    /**
     * 添加类名
     */
    addClass(element, className) {
        element.classList.add(className);
    },

    /**
     * 移除类名
     */
    removeClass(element, className) {
        element.classList.remove(className);
    },

    /**
     * 切换类名
     */
    toggleClass(element, className) {
        element.classList.toggle(className);
    },

    /**
     * 设置样式
     */
    setStyle(element, styles) {
        Object.assign(element.style, styles);
    },

    /**
     * 绑定事件
     */
    on(element, event, handler, options = {}) {
        element.addEventListener(event, handler, options);
    },

    /**
     * 解绑事件
     */
    off(element, event, handler) {
        element.removeEventListener(event, handler);
    }
};
