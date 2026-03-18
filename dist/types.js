"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponseHandler = exports.Middleware = exports.RequestType = void 0;
// 请求类型枚举
var RequestType;
(function (RequestType) {
    RequestType[RequestType["REQUEST"] = 0] = "REQUEST";
    RequestType[RequestType["PUSH"] = 1] = "PUSH";
    RequestType[RequestType["REQUEST_BACK"] = 2] = "REQUEST_BACK";
    RequestType[RequestType["PUSH_BACK"] = 3] = "PUSH_BACK";
    RequestType[RequestType["SYSTEM"] = 4] = "SYSTEM";
})(RequestType || (exports.RequestType = RequestType = {}));
// 中间件
class Middleware {
    constructor(route, fn) {
        this.route = route;
        this.fn = fn;
    }
}
exports.Middleware = Middleware;
// 响应处理器
class ResponseHandler {
    constructor(resolve, reject) {
        this.resolve = resolve;
        this.reject = reject;
    }
}
exports.ResponseHandler = ResponseHandler;
//# sourceMappingURL=types.js.map