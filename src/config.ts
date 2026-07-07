export interface Codec {
    marshal(data: unknown): string;
    unmarshal<T = unknown>(data: string): T;
}

export interface Logger {
    debug(message: string, ...args: unknown[]): void;
    info(message: string, ...args: unknown[]): void;
    warn(message: string, ...args: unknown[]): void;
    error(message: string, ...args: unknown[]): void;
}

export enum ClientMode {
    Client = 0,
    Server = 1,
}

export class Config {
    // 服务器地址。
    addr = "127.0.0.1";
    // 服务器端口。
    port = 22100;
    // 序列化方式。
    codec: Codec = new JsonCodec();
    // 日志记录器。
    logger: Logger = new ConsoleLogger();
    // 全局超时时间，单位毫秒。
    timeout = 5 * 60 * 1000;
    // 是否启用 TLS。
    enableTLS = false;
    // 是否直接连接游戏链路。
    directConnect = true;
    // 客户端连接模式。
    mode = ClientMode.Client;
}

export class JsonCodec implements Codec {
    marshal(data: unknown): string {
        if (data === undefined || data === null) {
            return "";
        }
        if (typeof data === "string") {
            return data;
        }
        if (data instanceof Uint8Array) {
            return new TextDecoder().decode(data);
        }
        return JSON.stringify(data);
    }

    unmarshal<T = unknown>(data: string): T {
        if (data === "") {
            return "" as T;
        }
        try {
            return JSON.parse(data) as T;
        } catch {
            return data as T;
        }
    }
}

export class ConsoleLogger implements Logger {
    debug(message: string, ...args: unknown[]): void {
        console.debug(`[DEBUG] ${message}`, ...args);
    }

    info(message: string, ...args: unknown[]): void {
        console.info(`[INFO] ${message}`, ...args);
    }

    warn(message: string, ...args: unknown[]): void {
        console.warn(`[WARN] ${message}`, ...args);
    }

    error(message: string, ...args: unknown[]): void {
        console.error(`[ERROR] ${message}`, ...args);
    }
}
