"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Middleware = exports.MessageType = void 0;
var MessageType;
(function (MessageType) {
    MessageType[MessageType["Request"] = 0] = "Request";
    MessageType[MessageType["Push"] = 1] = "Push";
    MessageType[MessageType["RequestBack"] = 2] = "RequestBack";
    MessageType[MessageType["PushBack"] = 3] = "PushBack";
})(MessageType || (exports.MessageType = MessageType = {}));
class Middleware {
    constructor(route, fn) {
        this.route = route;
        this.fn = fn;
    }
    match(route) {
        // 与 Go 端保持一致：中间件按路由前缀匹配。
        return route.startsWith(this.route);
    }
}
exports.Middleware = Middleware;
//# sourceMappingURL=types.js.map