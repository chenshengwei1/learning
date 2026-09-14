// ==================== Condition 条件 ====================

class Condition {
    match(shapeResult) {
        throw new Error('Condition.match() must be implemented');
    }
    
    // ===== 工厂方法 =====
    
    static shape(name) {
        return new ShapeCondition(name);
    }
    
    static and(...conditions) {
        return new AndCondition(conditions);
    }
    
    static or(...conditions) {
        return new OrCondition(conditions);
    }
    
    static not(condition) {
        return new NotCondition(condition);
    }
    
    static custom(fn) {
        return new CustomCondition(fn);
    }
}

class ShapeCondition extends Condition {
    constructor(shapeName) {
        super();
        this.shapeName = shapeName;
        this._length = null;
        this._direction = null;
        this._minLength = null;
        this._maxLength = null;
    }
    
    length(n) {
        this._length = n;
        return this;
    }
    
    minLength(n) {
        this._minLength = n;
        return this;
    }
    
    maxLength(n) {
        this._maxLength = n;
        return this;
    }
    
    direction(d) {
        this._direction = d;
        return this;
    }
    
    and(other) {
        return Condition.and(this, other);
    }
    
    or(other) {
        return Condition.or(this, other);
    }
    
    match(shapeResult) {
        if (!shapeResult) return false;
        if (shapeResult.shape !== this.shapeName) return false;
        if (this._length !== null && shapeResult.length !== this._length) return false;
        if (this._minLength !== null && shapeResult.length < this._minLength) return false;
        if (this._maxLength !== null && shapeResult.length > this._maxLength) return false;
        if (this._direction !== null && shapeResult.direction !== this._direction) return false;
        return true;
    }
}

class AndCondition extends Condition {
    constructor(conditions) {
        super();
        this.conditions = conditions;
    }
    
    match(shapeResult) {
        return this.conditions.every(c => c.match(shapeResult));
    }
}

class OrCondition extends Condition {
    constructor(conditions) {
        super();
        this.conditions = conditions;
    }
    
    length(n) {
        this.conditions.forEach(c => {
            if (c.length) c.length(n);
        });
        return this;
    }
    
    direction(d) {
        this.conditions.forEach(c => {
            if (c.direction) c.direction(d);
        });
        return this;
    }
    
    match(shapeResult) {
        return this.conditions.some(c => c.match(shapeResult));
    }
}

class NotCondition extends Condition {
    constructor(condition) {
        super();
        this.condition = condition;
    }
    
    match(shapeResult) {
        return !this.condition.match(shapeResult);
    }
}

class CustomCondition extends Condition {
    constructor(fn) {
        super();
        this.fn = fn;
    }
    
    match(shapeResult) {
        return this.fn(shapeResult);
    }
}

window.Condition = Condition;

// 简写
const condition = Condition;