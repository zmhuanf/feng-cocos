export interface ICodec {
    marshal(data: any): string;
    unmarshal(data: string): any;
}
export interface ILogger {
    debug(message: string, ...args: any[]): void;
    info(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    error(message: string, ...args: any[]): void;
}
export declare class Config {
    addr: string;
    port: number;
    codec: ICodec;
    logger: ILogger;
    timeout: number;
    enableTLS: boolean;
}
export declare class JsonCodec implements ICodec {
    marshal(data: any): string;
    unmarshal(data: string): any;
}
export declare class ConsoleLogger implements ILogger {
    debug(message: string, ...args: any[]): void;
    info(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    error(message: string, ...args: any[]): void;
}
