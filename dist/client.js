"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Client = void 0;
const config_1 = require("./config");
const context_1 = require("./context");
const func_1 = require("./func");
const types_1 = require("./types");
function generateUUID() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === "x" ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
class Client {
    constructor(config = new config_1.Config()) {
        this.conn = null;
        this.connSys = null;
        this.handlers = new Map();
        this.handlersSys = new Map();
        this.middlewares = [];
        this.middlewaresSys = [];
        this.pending = new Map();
        this.pendingSys = new Map();
        this.ctx = new context_1.ClientContext(this);
        this.config = config;
        this.registerBuiltinHandlers();
    }
    handle(route, handler) {
        this.setHandler(route, handler, false);
    }
    // 内置应答 供对端探测本条链路
    registerBuiltinHandlers() {
        this.setHandler("/ping", () => undefined, false);
        this.setHandler("/ping", () => undefined, true);
    }
    setHandler(route, handler, isSys) {
        if (typeof handler !== "function") {
            throw new Error("handler must be a function");
        }
        const handlers = isSys ? this.handlersSys : this.handlers;
        handlers.set(route, handler);
    }
    use(route, middleware) {
        this.registerMiddleware(route, middleware, false);
    }
    registerMiddleware(route, middleware, isSys) {
        if (typeof middleware !== "function") {
            throw new Error("middleware must be a function");
        }
        const middlewares = isSys ? this.middlewaresSys : this.middlewares;
        middlewares.push(new types_1.Middleware(route, middleware));
    }
    async connect() {
        const addr = `${this.config.addr}:${this.config.port}`;
        const needNew = this.config.mode === config_1.ClientMode.Server ? false : !this.config.directConnect;
        await this.connectInternal(addr, needNew);
    }
    async connectInternal(addr, needNew) {
        const protocol = this.config.enableTLS ? "wss" : "ws";
        if (this.config.mode === config_1.ClientMode.Client) {
            await this.connectSys(`${protocol}://${addr}/system`);
            const [, serverAddr] = await this.requestInternal("/get_low_load_server_addr", needNew, true);
            if (!serverAddr) {
                await this.connectUser(`${protocol}://${addr}/game`);
                return;
            }
            await this.connectInternal(serverAddr, false);
            return;
        }
        if (this.config.mode === config_1.ClientMode.Server) {
            await this.connectSys(`${protocol}://${addr}/system`);
            return;
        }
        throw new Error(`unknown client mode: ${this.config.mode}`);
    }
    connectSys(url) {
        this.connSys?.close();
        return this.openSocket(url, true);
    }
    connectUser(url) {
        this.conn?.close();
        return this.openSocket(url, false);
    }
    openSocket(url, isSys) {
        return new Promise((resolve, reject) => {
            const conn = new WebSocket(url);
            if (isSys) {
                this.connSys = conn;
            }
            else {
                this.conn = conn;
            }
            conn.onopen = () => resolve();
            conn.onmessage = (event) => this.handleMessage(String(event.data), isSys);
            conn.onerror = () => reject(new Error(`${isSys ? "system" : "user"} WebSocket connection failed`));
            conn.onclose = () => this.config.logger.info(`${isSys ? "System" : "User"} WebSocket connection closed`);
        });
    }
    // 走 system 通道请求对端 /ping 返回链路往返延迟 单位毫秒
    async ping() {
        const start = Date.now();
        await this.requestInternal("/ping", "", true);
        return Date.now() - start;
    }
    push(route, data = "") {
        this.sendMessage({
            route,
            id: generateUUID(),
            type: types_1.MessageType.Push,
            data: this.config.codec.marshal(data),
        }, false);
    }
    request(route, data = "") {
        return this.requestInternal(route, data, false);
    }
    requestInternal(route, data, isSys) {
        const id = generateUUID();
        const pending = isSys ? this.pendingSys : this.pending;
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                if (pending.delete(id)) {
                    reject(new Error("request timeout"));
                }
            }, this.config.timeout);
            pending.set(id, {
                timer,
                resolve: (payload) => resolve([this.ctx, payload]),
                reject,
            });
            try {
                this.sendMessage({
                    route,
                    id,
                    type: types_1.MessageType.Request,
                    data: this.config.codec.marshal(data),
                }, isSys);
            }
            catch (error) {
                clearTimeout(timer);
                pending.delete(id);
                reject(error instanceof Error ? error : new Error("send request failed"));
            }
        });
    }
    close() {
        this.conn?.close();
        this.connSys?.close();
        this.conn = null;
        this.connSys = null;
        this.clearPending(this.pending);
        this.clearPending(this.pendingSys);
        this.handlers.clear();
        this.handlersSys.clear();
        this.middlewares = [];
        this.middlewaresSys = [];
        this.registerBuiltinHandlers();
    }
    isConnected() {
        const systemConnected = this.connSys?.readyState === WebSocket.OPEN;
        const userConnected = this.conn?.readyState === WebSocket.OPEN;
        return this.config.mode === config_1.ClientMode.Server ? systemConnected : Boolean(systemConnected && userConnected);
    }
    handleMessage(message, isSys) {
        try {
            const request = this.config.codec.unmarshal(message);
            switch (request.type) {
                case types_1.MessageType.PushBack:
                    return;
                case types_1.MessageType.RequestBack:
                    this.handleResponse(request, isSys);
                    return;
                case types_1.MessageType.Push:
                case types_1.MessageType.Request:
                    this.handleIncoming(request, isSys);
                    return;
                default:
                    this.config.logger.error("unknown message type", request.type);
            }
        }
        catch (error) {
            this.config.logger.error("failed to handle message", error);
        }
    }
    handleResponse(message, isSys) {
        const pending = isSys ? this.pendingSys : this.pending;
        const item = pending.get(message.id);
        if (!item) {
            return;
        }
        pending.delete(message.id);
        clearTimeout(item.timer);
        if (!message.success) {
            item.reject(new Error(message.data));
            return;
        }
        try {
            item.resolve(this.config.codec.unmarshal(message.data));
        }
        catch (error) {
            item.reject(error instanceof Error ? error : new Error("failed to decode response"));
        }
    }
    handleIncoming(message, isSys) {
        const responseType = message.type === types_1.MessageType.Push ? types_1.MessageType.PushBack : types_1.MessageType.RequestBack;
        const middlewares = isSys ? this.middlewaresSys : this.middlewares;
        const handlers = isSys ? this.handlersSys : this.handlers;
        try {
            // 复制后再执行用户代码，避免处理中注册中间件导致迭代不稳定。
            for (const middleware of [...middlewares]) {
                if (!middleware.match(message.route)) {
                    continue;
                }
                const result = (0, func_1.callFunction)(middleware.fn, this.ctx, message.data);
                if (!result.success) {
                    this.sendResponse(message.id, responseType, false, result.error ?? "middleware error", isSys);
                    return;
                }
            }
            const handler = handlers.get(message.route);
            if (!handler) {
                this.sendResponse(message.id, responseType, false, "route not found", isSys);
                return;
            }
            const result = (0, func_1.callFunction)(handler, this.ctx, message.data);
            if (!result.success) {
                this.sendResponse(message.id, responseType, false, result.error ?? "handler error", isSys);
                return;
            }
            this.sendResponse(message.id, responseType, true, result.data ?? "", isSys);
        }
        catch (error) {
            this.sendResponse(message.id, responseType, false, error instanceof Error ? error.message : "unknown handler error", isSys);
        }
    }
    sendResponse(id, type, success, data, isSys) {
        this.sendMessage({
            route: "",
            id,
            type,
            data,
            success,
        }, isSys);
    }
    sendMessage(message, isSys) {
        const conn = isSys ? this.connSys : this.conn;
        if (!conn || conn.readyState !== WebSocket.OPEN) {
            throw new Error("client is not connected or closed");
        }
        conn.send(this.config.codec.marshal(message));
    }
    clearPending(pending) {
        for (const item of pending.values()) {
            clearTimeout(item.timer);
            item.reject(new Error("client closed"));
        }
        pending.clear();
    }
}
exports.Client = Client;
//# sourceMappingURL=client.js.map