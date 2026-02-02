import { Config } from "./config";
import { Context } from "./context";
import { callFunction, validateFunction } from "./func";
import { Middleware, ResponseHandler } from "./types";
import { RequestType, Request } from "./types";

function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export class Client {
    config: Config;

    private conn: WebSocket | null = null;
    private connSys: WebSocket | null = null;

    private handlers: Map<string, any> = new Map();
    private handlersSys: Map<string, any> = new Map();

    private middlewares: Middleware[] = [];
    private middlewaresSys: Middleware[] = [];

    private responses: Map<string, ResponseHandler> = new Map();
    private responsesSys: Map<string, ResponseHandler> = new Map();

    private ctx: Context = new Context(this);

    constructor(config: Config) {
        this.config = config;
    }

    addHandler(route: string, handler: any): void {
        this.addHandlerInternal(route, handler, false);
    }

    private addHandlerInternal(route: string, handler: any, isSys: boolean): void {
        if (!validateFunction(handler)) {
            throw new Error('Handler function must be a function with 1 or 2 arguments');
        }
        if (isSys) {
            this.handlersSys.set(route, handler);
        } else {
            this.handlers.set(route, handler);
        }
    }

    addMiddleware(route: string, middleware: any): void {
        this.addMiddlewareInternal(route, middleware, false);
    }

    private addMiddlewareInternal(route: string, middleware: any, isSys: boolean): void {
        if (!validateFunction(middleware)) {
            throw new Error('Middleware function must be a function with 2 arguments');
        }
        if (isSys) {
            this.middlewaresSys.push(new Middleware(route, middleware));
        } else {
            this.middlewares.push(new Middleware(route, middleware));
        }
    }

    async connect(): Promise<void> {
        const addr = `${this.config.addr}:${this.config.port}`;
        await this.connectInternal(addr, true);
    }

    private async connectInternal(addr: string, needNew: boolean): Promise<void> {
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

    private connectSys(url: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
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

    private connectUser(url: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
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

    private handleMessage(message: string, isSys: boolean): void {
        // console.log('handleMessage:', message);
        try {
            const request: Request = this.config.codec.unmarshal(message);
            switch (request.type) {
                case RequestType.PUSH_BACK:
                    break;
                case RequestType.REQUEST_BACK:
                    this.handleResponseInternal(request, isSys);
                    break;
                case RequestType.PUSH:
                case RequestType.REQUEST:
                    this.handleIncomingRequestInternal(request, isSys);
                    break;
                default:
                    this.config.logger.error('Unknown request type:', request.type);
            }
        } catch (error) {
            this.config.logger.error('Failed to handle message:', error);
        }
    }

    private handleResponseInternal(request: Request, isSys: boolean): void {
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
            } catch (error) {
                responseHandler.reject(error as Error);
            }
        } else {
            responseHandler.reject(new Error(request.data));
        }
    }

    private handleIncomingRequestInternal(request: Request, isSys: boolean): void {
        const responseType = request.type === RequestType.PUSH ? RequestType.PUSH_BACK : RequestType.REQUEST_BACK;
        // console.log('handleIncomingRequest:', request);

        try {
            // 执行中间件
            for (const middleware of this.middlewares) {
                if (request.route.startsWith(middleware.route)) {
                    const result = callFunction(
                        middleware.fn,
                        this.ctx,
                        request.data
                    );

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
            const result = callFunction(handler, this.ctx, request.data);
            // console.log('handleIncomingRequest:', result);

            if (result.success) {
                this.sendResponse(request.id, responseType, true, result.data || '', isSys);
            } else {
                this.sendResponse(request.id, responseType, false, result.error || 'Handler error', isSys);
            }

        } catch (error) {
            this.config.logger.error('Error handling request:', error);
            this.sendResponse(
                request.id,
                responseType,
                false,
                error instanceof Error ? error.message : 'Unknown error',
                isSys
            );
        }
    }

    private sendResponse(id: string, type: RequestType, success: boolean, data: string, isSys: boolean): void {
        const response: Request = {
            route: '',
            id,
            type,
            data,
            success
        };
        this.sendRequestInternal(response, isSys);
    }

    private sendRequest(request: Request): void {
        this.sendRequestInternal(request, false);
    }

    private sendRequestInternal(request: Request, isSys: boolean): void {
        this.checkConnected(isSys);
        let conn = isSys ? this.connSys : this.conn;
        const message = this.config.codec.marshal(request);
        conn!.send(message);
    }

    push(route: string, data: any = ""): void {
        const request: Request = {
            route,
            id: generateUUID(),
            type: RequestType.PUSH,
            data: this.config.codec.marshal(data)
        };
        this.sendRequest(request);
    }

    async request(route: string, data: any = ""): Promise<[Context, any]> {
        return this.requestInternal(route, data, false);
    }

    private async requestInternal(route: string, data: any, isSys: boolean): Promise<[Context, any]> {
        const requestId = generateUUID();
        let resMap = isSys ? this.responsesSys : this.responses;

        return new Promise<any>((resolve, reject) => {
            // 存储响应处理器
            resMap.set(requestId, {
                resolve: (data: any) => {
                    resMap.delete(requestId);
                    resolve([this.ctx, data]);
                },
                reject: (error: Error) => {
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

            const request: Request = {
                route,
                id: requestId,
                type: RequestType.REQUEST,
                data: this.config.codec.marshal(data)
            };

            try {
                this.sendRequestInternal(request, isSys);
            } catch (error) {
                resMap.delete(requestId);
                reject(error);
            }
        });
    }

    close(): void {
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

    private checkConnected(isSys: boolean): void {
        let conn = isSys ? this.connSys : this.conn;
        if (!conn || conn.readyState !== WebSocket.OPEN) {
            throw new Error('Client is not connected or closed');
        }
    }
}