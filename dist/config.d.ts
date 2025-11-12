/**
 * 序列化接口
 */
export interface ICodec {
    /**
     * 序列化数据
     */
    marshal(data: any): string;
    /**
     * 反序列化数据
     */
    unmarshal(data: string): any;
}
/**
 * 日志接口
 */
export interface ILogger {
    debug(message: string, ...args: any[]): void;
    info(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    error(message: string, ...args: any[]): void;
}
/**
 * 客户端配置
 */
export interface IConfig {
    /** 服务器地址 */
    addr: string;
    /** 服务器端口 */
    port: number;
    /** 序列化方式 */
    codec: ICodec;
    /** 日志记录器 */
    logger: ILogger;
    /** 全局超时时间（毫秒） */
    timeout: number;
    /** 启用TLS */
    enableTLS: boolean;
}
/**
 * JSON序列化器
 */
export declare class JsonCodec implements ICodec {
    marshal(data: any): string;
    unmarshal(data: string): any;
}
/**
 * 控制台日志记录器
 */
export declare class ConsoleLogger implements ILogger {
    debug(message: string, ...args: any[]): void;
    info(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    error(message: string, ...args: any[]): void;
}
/**
 * 默认客户端配置
 */
export declare class DefaultConfig implements IConfig {
    addr: string;
    port: number;
    codec: ICodec;
    logger: ILogger;
    timeout: number;
    enableTLS: boolean;
    constructor(config?: Partial<IConfig>);
}
//# sourceMappingURL=config.d.ts.map