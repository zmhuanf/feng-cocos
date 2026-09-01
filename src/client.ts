import { ClientMode, Config } from "./config";
import { ClientContext } from "./context";
import { callFunction } from "./func";
import {
    Handler,
    HandlerWithoutData,
    Message,
    MessageType,
    Middleware,
    MiddlewareHandler,
    MiddlewareWithoutData,
    PendingRequest,
} from "./types";

function generateUUID(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === "x" ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export class Client {
    config: Config;

    private conn: WebSocket | null = null;
    private connSys: WebSocket | null = null;
    private handlers = new Map<string, Handler | HandlerWithoutData>();
    private handlersSys = new Map<string, Handler | HandlerWithoutData>();
    private middlewares: Middleware[] = [];
    private middlewaresSys: Middleware[] = [];
    private pending = new Map<string, PendingRequest>();
    private pendingSys = new Map<string, PendingRequest>();
    private ctx = new ClientContext(this);

    constructor(config: Config = new Config()) {
        this.config = config;
        this.registerBuiltinHandlers();
    }

    handle<R = unknown>(route: string, handler: HandlerWithoutData<R>): void;
    handle<T = unknown, R = unknown>(route: string, handler: Handler<T, R>): void;
    handle(route: string, handler: Handler | HandlerWithoutData): void {
        this.setHandler(route, handler, false);
    }

    // 内置应答 供对端探测本条链路
    private registerBuiltinHandlers(): void {
        this.setHandler("/ping", () => undefined, false);
        this.setHandler("/ping", () => undefined, true);
    }

    private setHandler(route: string, handler: Handler | HandlerWithoutData, isSys: boolean): void {
        if (typeof handler !== "function") {
            throw new Error("handler must be a function");
        }
        const handlers = isSys ? this.handlersSys : this.handlers;
        handlers.set(route, handler);
    }

    use(route: string, middleware: MiddlewareWithoutData): void;
    use<T = unknown>(route: string, middleware: MiddlewareHandler<T>): void;
    use(route: string, middleware: MiddlewareHandler | MiddlewareWithoutData): void {
        this.registerMiddleware(route, middleware, false);
    }

    private registerMiddleware(route: string, middleware: MiddlewareHandler | MiddlewareWithoutData, isSys: boolean): void {
        if (typeof middleware !== "function") {
            throw new Error("middleware must be a function");
        }
        const middlewares = isSys ? this.middlewaresSys : this.middlewares;
        middlewares.push(new Middleware(route, middleware));
    }

    async connect(): Promise<void> {
        const addr = `${this.config.addr}:${this.config.port}`;
        const needNew = this.config.mode === ClientMode.Server ? false : !this.config.directConnect;
        await this.connectInternal(addr, needNew);
    }

    private async connectInternal(addr: string, needNew: boolean): Promise<void> {
        const protocol = this.config.enableTLS ? "wss" : "ws";
        if (this.config.mode === ClientMode.Client) {
            await this.connectSys(`${protocol}://${addr}/system`);

            const [, serverAddr] = await this.requestInternal<string>("/get_low_load_server_addr", needNew, true);
            if (!serverAddr) {
                await this.connectUser(`${protocol}://${addr}/game`);
                return;
            }

            await this.connectInternal(serverAddr, false);
            return;
        }

        if (this.config.mode === ClientMode.Server) {
            await this.connectSys(`${protocol}://${addr}/system`);
            return;
        }

        throw new Error(`unknown client mode: ${this.config.mode}`);
    }

    private connectSys(url: string): Promise<void> {
        this.connSys?.close();
        return this.openSocket(url, true);
    }

    private connectUser(url: string): Promise<void> {
        this.conn?.close();
        return this.openSocket(url, false);
    }

    private openSocket(url: string, isSys: boolean): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const conn = new WebSocket(url);
            if (isSys) {
                this.connSys = conn;
            } else {
                this.conn = conn;
            }

            conn.onopen = () => resolve();
            conn.onmessage = (event) => this.handleMessage(String(event.data), isSys);
            conn.onerror = () => reject(new Error(`${isSys ? "system" : "user"} WebSocket connection failed`));
            conn.onclose = () => this.config.logger.info(`${isSys ? "System" : "User"} WebSocket connection closed`);
        });
    }

    // 走 system 通道请求对端 /ping 返回链路往返延迟 单位毫秒
    async ping(): Promise<number> {
        const start = Date.now();
        await this.requestInternal<unknown>("/ping", "", true);
        return Date.now() - start;
    }

    push(route: string, data: unknown = ""): void {
        this.sendMessage({
            route,
            id: generateUUID(),
            type: MessageType.Push,
            data: this.config.codec.marshal(data),
        }, false);
    }

    request<T = unknown>(route: string, data: unknown = ""): Promise<[ClientContext, T]> {
        return this.requestInternal<T>(route, data, false);
    }

    private requestInternal<T>(route: string, data: unknown, isSys: boolean): Promise<[ClientContext, T]> {
        const id = generateUUID();
        const pending = isSys ? this.pendingSys : this.pending;

        return new Promise<[ClientContext, T]>((resolve, reject) => {
            const timer = setTimeout(() => {
                if (pending.delete(id)) {
                    reject(new Error("request timeout"));
                }
            }, this.config.timeout);

            pending.set(id, {
                timer,
                resolve: (payload: unknown) => resolve([this.ctx, payload as T]),
                reject,
            });

            try {
                this.sendMessage({
                    route,
                    id,
                    type: MessageType.Request,
                    data: this.config.codec.marshal(data),
                }, isSys);
            } catch (error) {
                clearTimeout(timer);
                pending.delete(id);
                reject(error instanceof Error ? error : new Error("send request failed"));
            }
        });
    }

    close(): void {
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

    isConnected(): boolean {
        const systemConnected = this.connSys?.readyState === WebSocket.OPEN;
        const userConnected = this.conn?.readyState === WebSocket.OPEN;
        return this.config.mode === ClientMode.Server ? systemConnected : Boolean(systemConnected && userConnected);
    }

    private handleMessage(message: string, isSys: boolean): void {
        try {
            const request = this.config.codec.unmarshal<Message>(message);
            switch (request.type) {
                case MessageType.PushBack:
                    return;
                case MessageType.RequestBack:
                    this.handleResponse(request, isSys);
                    return;
                case MessageType.Push:
                case MessageType.Request:
                    this.handleIncoming(request, isSys);
                    return;
                default:
                    this.config.logger.error("unknown message type", request.type);
            }
        } catch (error) {
            this.config.logger.error("failed to handle message", error);
        }
    }

    private handleResponse(message: Message, isSys: boolean): void {
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
        } catch (error) {
            item.reject(error instanceof Error ? error : new Error("failed to decode response"));
        }
    }

    private handleIncoming(message: Message, isSys: boolean): void {
        const responseType = message.type === MessageType.Push ? MessageType.PushBack : MessageType.RequestBack;
        const middlewares = isSys ? this.middlewaresSys : this.middlewares;
        const handlers = isSys ? this.handlersSys : this.handlers;

        try {
            // 复制后再执行用户代码，避免处理中注册中间件导致迭代不稳定。
            for (const middleware of [...middlewares]) {
                if (!middleware.match(message.route)) {
                    continue;
                }
                const result = callFunction(middleware.fn, this.ctx, message.data);
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

            const result = callFunction(handler, this.ctx, message.data);
            if (!result.success) {
                this.sendResponse(message.id, responseType, false, result.error ?? "handler error", isSys);
                return;
            }

            this.sendResponse(message.id, responseType, true, result.data ?? "", isSys);
        } catch (error) {
            this.sendResponse(
                message.id,
                responseType,
                false,
                error instanceof Error ? error.message : "unknown handler error",
                isSys,
            );
        }
    }

    private sendResponse(id: string, type: MessageType, success: boolean, data: string, isSys: boolean): void {
        this.sendMessage({
            route: "",
            id,
            type,
            data,
            success,
        }, isSys);
    }

    private sendMessage(message: Message, isSys: boolean): void {
        const conn = isSys ? this.connSys : this.conn;
        if (!conn || conn.readyState !== WebSocket.OPEN) {
            throw new Error("client is not connected or closed");
        }
        conn.send(this.config.codec.marshal(message));
    }

    private clearPending(pending: Map<string, PendingRequest>): void {
        for (const item of pending.values()) {
            clearTimeout(item.timer);
            item.reject(new Error("client closed"));
        }
        pending.clear();
    }
}
