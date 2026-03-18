"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Client = void 0;
const context_1 = require("./context");
const func_1 = require("./func");
const types_1 = require("./types");
const types_2 = require("./types");
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
class Client {
    constructor(config) {
        this.conn = null;
        this.connSys = null;
        this.handlers = new Map();
        this.handlersSys = new Map();
        this.middlewares = [];
        this.middlewaresSys = [];
        this.responses = new Map();
        this.responsesSys = new Map();
        this.ctx = new context_1.Context(this);
        this.config = config;
    }
    addHandler(route, handler) {
        this.addHandlerInternal(route, handler, false);
    }
    addHandlerInternal(route, handler, isSys) {
        if (!(0, func_1.validateFunction)(handler)) {
            throw new Error('Handler function must be a function with 1 or 2 arguments');
        }
        if (isSys) {
            this.handlersSys.set(route, handler);
        }
        else {
            this.handlers.set(route, handler);
        }
    }
    addMiddleware(route, middleware) {
        this.addMiddlewareInternal(route, middleware, false);
    }
    addMiddlewareInternal(route, middleware, isSys) {
        if (!(0, func_1.validateFunction)(middleware)) {
            throw new Error('Middleware function must be a function with 2 arguments');
        }
        if (isSys) {
            this.middlewaresSys.push(new types_1.Middleware(route, middleware));
        }
        else {
            this.middlewares.push(new types_1.Middleware(route, middleware));
        }
    }
    async connect() {
        const addr = `${this.config.addr}:${this.config.port}`;
        await this.connectInternal(addr, true);
    }
    async connectInternal(addr, needNew) {
        const protocol = this.config.enableTLS ? 'wss' : 'ws';
        // 1. 连接系统通信
        await this.connectSys(`${protocol}://${addr}/system`);
        // 2. 获取最低负载服务器地址
        const [, serverAddr] = await this.requestInternal('/get_low_load_server_addr', needNew, true);
        // 3. 如果返回空地址，直接连接当前地址的用户通信
        if (!serverAddr) {
            await this.connectUser(`${protocol}://${addr}/game`);
            return;
        }
        // 4. 如果返回不同地址，重新连接该地址
        await this.connectInternal(serverAddr, false);
    }
    connectSys(url) {
        return new Promise((resolve, reject) => {
            this.connSys = new WebSocket(url);
            this.connSys.onopen = () => {
                resolve();
            };
            this.connSys.onmessage = (event) => {
                this.handleMessage(event.data, true);
            };
            this.connSys.onerror = () => {
                reject(new Error('System WebSocket connection failed'));
            };
            this.connSys.onclose = () => {
            };
        });
    }
    connectUser(url) {
        return new Promise((resolve, reject) => {
            this.conn = new WebSocket(url);
            this.conn.onopen = () => {
                resolve();
            };
            this.conn.onmessage = (event) => {
                this.handleMessage(event.data, false);
            };
            this.conn.onerror = (error) => {
                reject(new Error('User WebSocket connection failed'));
            };
            this.conn.onclose = () => {
                this.config.logger.info('User WebSocket connection closed');
            };
        });
    }
    handleMessage(message, isSys) {
        // console.log('handleMessage:', message);
        try {
            const request = this.config.codec.unmarshal(message);
            switch (request.type) {
                case types_2.RequestType.PUSH_BACK:
                    break;
                case types_2.RequestType.REQUEST_BACK:
                    this.handleResponseInternal(request, isSys);
                    break;
                case types_2.RequestType.PUSH:
                case types_2.RequestType.REQUEST:
                    this.handleIncomingRequestInternal(request, isSys);
                    break;
                default:
                    this.config.logger.error('Unknown request type:', request.type);
            }
        }
        catch (error) {
            this.config.logger.error('Failed to handle message:', error);
        }
    }
    handleResponseInternal(request, isSys) {
        // this.config.logger.info('handleResponse:', request);
        const responseHandler = isSys ? this.responsesSys.get(request.id) : this.responses.get(request.id);
        if (!responseHandler) {
            this.config.logger.error('No handler found for response:', request.id);
            return;
        }
        if (request.success) {
            try {
                const data = this.config.codec.unmarshal(request.data);
                responseHandler.resolve(data);
            }
            catch (error) {
                responseHandler.reject(error);
            }
        }
        else {
            responseHandler.reject(new Error(request.data));
        }
    }
    handleIncomingRequestInternal(request, isSys) {
        const responseType = request.type === types_2.RequestType.PUSH ? types_2.RequestType.PUSH_BACK : types_2.RequestType.REQUEST_BACK;
        // console.log('handleIncomingRequest:', request);
        try {
            // 执行中间件
            for (const middleware of this.middlewares) {
                if (request.route.startsWith(middleware.route)) {
                    const result = (0, func_1.callFunction)(middleware.fn, this.ctx, request.data);
                    if (!result.success) {
                        this.sendResponse(request.id, responseType, false, result.error || 'Middleware error', isSys);
                        return;
                    }
                }
            }
            // 查找路由处理器
            const handler = this.handlers.get(request.route);
            if (!handler) {
                this.sendResponse(request.id, responseType, false, 'Route not found', isSys);
                return;
            }
            // 执行处理器
            const result = (0, func_1.callFunction)(handler, this.ctx, request.data);
            // console.log('handleIncomingRequest:', result);
            if (result.success) {
                this.sendResponse(request.id, responseType, true, result.data || '', isSys);
            }
            else {
                this.sendResponse(request.id, responseType, false, result.error || 'Handler error', isSys);
            }
        }
        catch (error) {
            this.config.logger.error('Error handling request:', error);
            this.sendResponse(request.id, responseType, false, error instanceof Error ? error.message : 'Unknown error', isSys);
        }
    }
    sendResponse(id, type, success, data, isSys) {
        const response = {
            route: '',
            id,
            type,
            data,
            success
        };
        this.sendRequestInternal(response, isSys);
    }
    sendRequest(request) {
        this.sendRequestInternal(request, false);
    }
    sendRequestInternal(request, isSys) {
        this.checkConnected(isSys);
        let conn = isSys ? this.connSys : this.conn;
        const message = this.config.codec.marshal(request);
        conn.send(message);
    }
    push(route, data = "") {
        const request = {
            route,
            id: generateUUID(),
            type: types_2.RequestType.PUSH,
            data: this.config.codec.marshal(data)
        };
        this.sendRequest(request);
    }
    async request(route, data = "") {
        return this.requestInternal(route, data, false);
    }
    async requestInternal(route, data, isSys) {
        const requestId = generateUUID();
        let resMap = isSys ? this.responsesSys : this.responses;
        return new Promise((resolve, reject) => {
            // 存储响应处理器
            resMap.set(requestId, {
                resolve: (data) => {
                    resMap.delete(requestId);
                    resolve([this.ctx, data]);
                },
                reject: (error) => {
                    resMap.delete(requestId);
                    reject(error);
                }
            });
            // 配置超时删除，防止内存泄漏
            const timeoutMs = this.config.timeout || 30000;
            setTimeout(() => {
                if (resMap.has(requestId)) {
                    resMap.delete(requestId);
                    reject(new Error('Request timeout'));
                }
            }, timeoutMs);
            const request = {
                route,
                id: requestId,
                type: types_2.RequestType.REQUEST,
                data: this.config.codec.marshal(data)
            };
            try {
                this.sendRequestInternal(request, isSys);
            }
            catch (error) {
                resMap.delete(requestId);
                reject(error);
            }
        });
    }
    close() {
        if (this.connSys) {
            this.connSys.close();
            this.connSys = null;
        }
        if (this.conn) {
            this.conn.close();
            this.conn = null;
        }
        this.responses.clear();
        this.handlers.clear();
        this.middlewares = [];
    }
    checkConnected(isSys) {
        let conn = isSys ? this.connSys : this.conn;
        if (!conn || conn.readyState !== WebSocket.OPEN) {
            throw new Error('Client is not connected or closed');
        }
    }
}
exports.Client = Client;
//# sourceMappingURL=client.js.map