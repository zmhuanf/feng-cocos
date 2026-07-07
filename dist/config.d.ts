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
export declare enum ClientMode {
    Client = 0,
    Server = 1
}
export declare class Config {
    addr: string;
    port: number;
    codec: Codec;
    logger: Logger;
    timeout: number;
    enableTLS: boolean;
    directConnect: boolean;
    mode: ClientMode;
}
export declare class JsonCodec implements Codec {
    marshal(data: unknown): string;
    unmarshal<T = unknown>(data: string): T;
}
export declare class ConsoleLogger implements Logger {
    debug(message: string, ...args: unknown[]): void;
    info(message: string, ...args: unknown[]): void;
    warn(message: string, ...args: unknown[]): void;
    error(message: string, ...args: unknown[]): void;
}
