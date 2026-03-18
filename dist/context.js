"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Context = void 0;
// 上下文
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
//# sourceMappingURL=context.js.map