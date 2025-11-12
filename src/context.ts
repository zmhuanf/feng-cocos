import { IClient } from './types';

/**
 * 上下文接口
 */
export interface IContext {
    /**
     * 获取客户端实例
     */
    getClient(): IClient;
    get(key: string): any;
    set(key: string, value: any): void;
}

/**
 * 上下文实现类
 */
export class Context implements IContext {
    private client: IClient;
    private state: Map<string, any> = new Map();

    constructor(client: IClient) {
        this.client = client;
    }

    getClient(): IClient {
        return this.client;
    }

    get(key: string): any {
        return this.state.get(key);
    }

    set(key: string, value: any): void {
        this.state.set(key, value);
    }
}

/**
 * 创建新的上下文实例
 */
export function createContext(client: IClient): IContext {
    return new Context(client);
}