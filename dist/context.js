"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientContext = void 0;
class ClientContext {
    constructor(client) {
        this.state = new Map();
        this.owner = client;
    }
    client() {
        return this.owner;
    }
    get(key) {
        return this.state.get(key);
    }
    set(key, value) {
        this.state.set(key, value);
    }
}
exports.ClientContext = ClientContext;
//# sourceMappingURL=context.js.map