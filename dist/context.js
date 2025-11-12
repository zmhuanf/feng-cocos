"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Context = void 0;
exports.createContext = createContext;
/**
 * 上下文实现类
 */
class Context {
    constructor(client) {
        this.state = new Map();
        this.client = client;
    }
    getClient() {
        return this.client;
    }
    get(key) {
        return this.state.get(key);
    }
    set(key, value) {
        this.state.set(key, value);
    }
}
exports.Context = Context;
/**
 * 创建新的上下文实例
 */
function createContext(client) {
    return new Context(client);
}
//# sourceMappingURL=context.js.map