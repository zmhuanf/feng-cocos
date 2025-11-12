import { IConfig, DefaultConfig } from "./config";
import { createContext, IContext } from "./context";
import { callFunction } from "./func";
import { IClient, Middleware, ResponseHandler } from "./types";
import { RequestType, Request } from "./types";

function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export class Client implements IClient {
    private config: IConfig;
    private ws: WebSocket | null = null;
    private handlers: Map<string, any> = new Map();
    private middlewares: Middleware[] = [];
    private responses: Map<string, ResponseHandler> = new Map();
    private isConnected: boolean = false;
    private isClosed: boolean = false;

    constructor(config: IConfig) {
        this.config = config;
    }

    addHandler(route: string, handler: any): void {
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

    addMiddleware(route: string, middleware: any): void {
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

    connect(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
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

    handleMessage(message: string): void {
        // console.log('handleMessage:', message);
        try {
            const request: Request = this.config.codec.unmarshal(message);
            switch (request.type) {
                case RequestType.PUSH_BACK:
                    break;
                case RequestType.REQUEST_BACK:
                    this.handleResponse(request);
                    break;
                case RequestType.PUSH:
                case RequestType.REQUEST:
                    this.handleIncomingRequest(request);
                    break;
                default:
                    this.config.logger.warn('Unknown request type:', request.type);
            }
        } catch (error) {
            this.config.logger.error('Failed to handle message:', error);
        }
    }

    handleResponse(request: Request): void {
        // this.config.logger.info('handleResponse:', request);
        const responseHandler = this.responses.get(request.id);
        if (!responseHandler) {
            this.config.logger.warn('No handler found for response:', request.id);
            return;
        }
        const ctx = createContext(this);
        if (request.success) {
            try {
                const data = this.config.codec.unmarshal(request.data);
                responseHandler.resolve({
                    context: ctx,
                    data,
                });
            } catch (error) {
                responseHandler.reject(error as Error);
            }
        } else {
            responseHandler.reject(new Error(request.data));
        }
    }

    async handleIncomingRequest(request: Request): Promise<void> {
        const ctx = createContext(this);
        const responseType = request.type === RequestType.PUSH
            ? RequestType.PUSH_BACK
            : RequestType.REQUEST_BACK;
        
        // console.log('handleIncomingRequest:', request);

        try {
            // 执行中间件
            for (const middleware of this.middlewares) {
                if (request.route.startsWith(middleware.route)) {
                    const result = callFunction(
                        middleware.fn,
                        ctx,
                        request.data
                    );

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
            const result = callFunction(handler, ctx, request.data);
            // console.log('handleIncomingRequest:', result);

            if (result.success) {
                await this.sendResponse(request.id, responseType, true, result.data || '');
            } else {
                await this.sendResponse(request.id, responseType, false, result.error || 'Handler error');
            }

        } catch (error) {
            this.config.logger.error('Error handling request:', error);
            await this.sendResponse(
                request.id,
                responseType,
                false,
                error instanceof Error ? error.message : 'Unknown error'
            );
        }
    }

    async sendResponse(
        id: string,
        type: RequestType,
        success: boolean,
        data: string
    ): Promise<void> {
        const response: Request = {
            route: '',
            id,
            type,
            data,
            success
        };

        await this.sendRequest(response);
    }

    async sendRequest(request: Request): Promise<void> {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            throw new Error('WebSocket is not connected');
        }

        const message = this.config.codec.marshal(request);
        this.ws.send(message);
    }

    async push(route: string, data: any): Promise<void> {
        if (!this.isConnected || this.isClosed) {
            throw new Error('Client is not connected or closed');
        }
        const request: Request = {
            route,
            id: generateUUID(),
            type: RequestType.PUSH,
            data: this.config.codec.marshal(data)
        };
        await this.sendRequest(request);
    }

    async request(route: string, data: any): Promise<any> {
        if (!this.isConnected || this.isClosed) {
            throw new Error('Client is not connected or closed');
        }
        const requestId = generateUUID();
        
        return new Promise<any>((resolve, reject) => {
            // 存储响应处理器
            this.responses.set(requestId, {
                resolve: (data: any) => {
                    this.responses.delete(requestId);
                    resolve(data);
                },
                reject: (error: Error) => {
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
            
            const request: Request = {
                route,
                id: requestId,
                type: RequestType.REQUEST,
                data: this.config.codec.marshal(data)
            };
            
            this.sendRequest(request).catch(error => {
                this.responses.delete(requestId);
                reject(error);
            });
        });
    }

    getConfig(): IConfig {
        return this.config;
    }
    
    close(): void {
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

/**
 * 创建新的客户端实例
 */
export function createClient(config?: Partial<IConfig>): IClient {
    return new Client(new DefaultConfig(config));
}