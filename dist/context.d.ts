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
export declare class Context implements IContext {
    private client;
    private state;
    constructor(client: IClient);
    getClient(): IClient;
    get(key: string): any;
    set(key: string, value: any): void;
}
/**
 * 创建新的上下文实例
 */
export declare function createContext(client: IClient): IContext;
