"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Client = void 0;
exports.createClient = createClient;
const config_1 = require("./config");
const context_1 = require("./context");
const func_1 = require("./func");
const types_1 = require("./types");
const uuid_1 = require("uuid");
class Client {
    constructor(config) {
        this.ws = null;
        this.handlers = new Map();
        this.middlewares = [];
        this.responses = new Map();
        this.isConnected = false;
        this.isClosed = false;
        this.config = config;
    }
    addHandler(route, handler) {
        if (this.isClosed) {
            throw new Error('Client is closed');
        }
        if (typeof handler !== 'function') {
            throw new Error('Handler must be a function');
        }
        if (handler.length !== 2) {
            throw new Error('Handler function must have exactly 2 arguments');
        }
        this.handlers.set(route, handler);
    }
    addMiddleware(route, middleware) {
        if (this.isClosed) {
            throw new Error('Client is closed');
        }
        if (typeof middleware !== 'function') {
            throw new Error('Middleware must be a function');
        }
        if (middleware.length !== 2) {
            throw new Error('Middleware function must have exactly 2 arguments');
        }
        this.middlewares.push({ route, fn: middleware });
    }
    connect() {
        return new Promise((resolve, reject) => {
            const protocol = this.config.enableTLS ? 'wss' : 'ws';
            const url = `${protocol}://${this.config.addr}:${this.config.port}`;
            this.ws = new WebSocket(url);
            this.ws.onopen = () => {
                this.isConnected = true;
                this.config.logger.info('WebSocket connected successfully');
                resolve();
            };
            this.ws.onmessage = (event) => {
                this.handleMessage(event.data);
            };
            this.ws.onerror = (error) => {
                this.config.logger.error('WebSocket connection error', error);
                reject(new Error('WebSocket connection failed'));
            };
            this.ws.onclose = () => {
                this.isConnected = false;
                this.config.logger.info('WebSocket connection closed');
            };
        });
    }
    handleMessage(message) {
        // console.log('handleMessage:', message);
        try {
            const request = this.config.codec.unmarshal(message);
            switch (request.type) {
                case types_1.RequestType.PUSH_BACK:
                    break;
                case types_1.RequestType.REQUEST_BACK:
                    this.handleResponse(request);
                    break;
                case types_1.RequestType.PUSH:
                case types_1.RequestType.REQUEST:
                    this.handleIncomingRequest(request);
                    break;
                default:
                    this.config.logger.warn('Unknown request type:', request.type);
            }
        }
        catch (error) {
            this.config.logger.error('Failed to handle message:', error);
        }
    }
    handleResponse(request) {
        // this.config.logger.info('handleResponse:', request);
        const responseHandler = this.responses.get(request.id);
        if (!responseHandler) {
            this.config.logger.warn('No handler found for response:', request.id);
            return;
        }
        const ctx = (0, context_1.createContext)(this);
        if (request.success) {
            try {
                const data = this.config.codec.unmarshal(request.data);
                responseHandler.resolve({
                    context: ctx,
                    data,
                });
            }
            catch (error) {
                responseHandler.reject(error);
            }
        }
        else {
            responseHandler.reject(new Error(request.data));
        }
    }
    async handleIncomingRequest(request) {
        const ctx = (0, context_1.createContext)(this);
        const responseType = request.type === types_1.RequestType.PUSH
            ? types_1.RequestType.PUSH_BACK
            : types_1.RequestType.REQUEST_BACK;
        // console.log('handleIncomingRequest:', request);
        try {
            // 执行中间件
            for (const middleware of this.middlewares) {
                if (request.route.startsWith(middleware.route)) {
                    const result = (0, func_1.callFunction)(middleware.fn, ctx, request.data);
                    if (!result.success) {
                        await this.sendResponse(request.id, responseType, false, result.error || 'Middleware error');
                        return;
                    }
                }
            }
            // 查找路由处理器
            const handler = this.handlers.get(request.route);
            if (!handler) {
                await this.sendResponse(request.id, responseType, false, 'Route not found');
                return;
            }
            // 执行处理器
            const result = (0, func_1.callFunction)(handler, ctx, request.data);
            // console.log('handleIncomingRequest:', result);
            if (result.success) {
                await this.sendResponse(request.id, responseType, true, result.data || '');
            }
            else {
                await this.sendResponse(request.id, responseType, false, result.error || 'Handler error');
            }
        }
        catch (error) {
            this.config.logger.error('Error handling request:', error);
            await this.sendResponse(request.id, responseType, false, error instanceof Error ? error.message : 'Unknown error');
        }
    }
    async sendResponse(id, type, success, data) {
        const response = {
            route: '',
            id,
            type,
            data,
            success
        };
        await this.sendRequest(response);
    }
    async sendRequest(request) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            throw new Error('WebSocket is not connected');
        }
        const message = this.config.codec.marshal(request);
        this.ws.send(message);
    }
    async push(route, data) {
        if (!this.isConnected || this.isClosed) {
            throw new Error('Client is not connected or closed');
        }
        const request = {
            route,
            id: (0, uuid_1.v4)(),
            type: types_1.RequestType.PUSH,
            data: this.config.codec.marshal(data)
        };
        await this.sendRequest(request);
    }
    async request(route, data) {
        if (!this.isConnected || this.isClosed) {
            throw new Error('Client is not connected or closed');
        }
        const requestId = (0, uuid_1.v4)();
        return new Promise((resolve, reject) => {
            // 存储响应处理器
            this.responses.set(requestId, {
                resolve: (data) => {
                    this.responses.delete(requestId);
                    resolve(data);
                },
                reject: (error) => {
                    this.responses.delete(requestId);
                    reject(error);
                }
            });
            // 配置超时删除，防止内存泄漏
            const timeoutMs = this.config.timeout || 30000;
            setTimeout(() => {
                if (this.responses.has(requestId)) {
                    this.responses.delete(requestId);
                    reject(new Error('Request timeout'));
                }
            }, timeoutMs);
            const request = {
                route,
                id: requestId,
                type: types_1.RequestType.REQUEST,
                data: this.config.codec.marshal(data)
            };
            this.sendRequest(request).catch(error => {
                this.responses.delete(requestId);
                reject(error);
            });
        });
    }
    getConfig() {
        return this.config;
    }
    close() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.isConnected = false;
        this.isClosed = true;
        this.responses.clear();
        this.handlers.clear();
        this.middlewares = [];
    }
}
exports.Client = Client;
/**
 * 创建新的客户端实例
 */
function createClient(config) {
    return new Client(new config_1.DefaultConfig(config));
}
//# sourceMappingURL=client.js.map