import { IConfig } from "./config";
import { IClient } from "./types";
import { RequestType, Request } from "./types";
export declare class Client implements IClient {
    private config;
    private ws;
    private handlers;
    private middlewares;
    private responses;
    private isConnected;
    private isClosed;
    constructor(config: IConfig);
    addHandler(route: string, handler: any): void;
    addMiddleware(route: string, middleware: any): void;
    connect(): Promise<void>;
    handleMessage(message: string): void;
    handleResponse(request: Request): void;
    handleIncomingRequest(request: Request): Promise<void>;
    sendResponse(id: string, type: RequestType, success: boolean, data: string): Promise<void>;
    sendRequest(request: Request): Promise<void>;
    push(route: string, data: any): Promise<void>;
    request(route: string, data: any): Promise<any>;
    getConfig(): IConfig;
    close(): void;
}
/**
 * 创建新的客户端实例
 */
export declare function createClient(config?: Partial<IConfig>): IClient;
