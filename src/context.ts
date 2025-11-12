import { IClient } from './types';

/**
 * 上下文接口
 */
export interface IContext {
    /**
     * 获取客户端实例
     */
    getClient(): IClient;
}

/**
 * 上下文实现类
 */
export class Context implements IContext {
    private client: IClient;

    constructor(client: IClient) {
        this.client = client;
    }

    getClient(): IClient {
        return this.client;
    }
}

/**
 * 创建新的上下文实例
 */
export function createContext(client: IClient): IContext {
    return new Context(client);
}