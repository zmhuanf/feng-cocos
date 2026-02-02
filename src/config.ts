// 序列化接口
export interface ICodec {
    // 序列化数据
    marshal(data: any): string;
    // 反序列化数据
    unmarshal(data: string): any;
}

// 日志接口
export interface ILogger {
    debug(message: string, ...args: any[]): void;
    info(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    error(message: string, ...args: any[]): void;
}

// 客户端配置
export class Config {
    // 服务器地址
    addr: string = "127.0.0.1";
    // 服务器端口
    port: number = 22100;
    // 序列化方式
    codec: ICodec = new JsonCodec();
    // 日志记录器
    logger: ILogger = new ConsoleLogger();
    // 全局超时时间（毫秒）
    timeout: number = 5 * 60 * 1000;
    // 启用TLS
    enableTLS: boolean = false;
}

// JSON序列化器
export class JsonCodec implements ICodec {
    marshal(data: any): string {
        if (data == "") {
            return "";
        }
        return JSON.stringify(data);
    }

    unmarshal(data: string): any {
        if (data == "") {
            return "";
        }
        return JSON.parse(data);
    }
}

// 控制台日志记录器
export class ConsoleLogger implements ILogger {
    debug(message: string, ...args: any[]): void {
        console.debug(`[DEBUG] ${message}`, ...args);
    }

    info(message: string, ...args: any[]): void {
        console.info(`[INFO] ${message}`, ...args);
    }

    warn(message: string, ...args: any[]): void {
        console.warn(`[WARN] ${message}`, ...args);
    }

    error(message: string, ...args: any[]): void {
        console.error(`[ERROR] ${message}`, ...args);
    }
}
