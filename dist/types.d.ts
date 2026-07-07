import { ClientContext } from "./context";
export declare enum MessageType {
    Request = 0,
    Push = 1,
    RequestBack = 2,
    PushBack = 3
}
export interface Message {
    route: string;
    id: string;
    type: MessageType;
    data: string;
    success?: boolean;
}
export type Handler<T = unknown, R = unknown> = (ctx: ClientContext, data: T) => R | void;
export type HandlerWithoutData<R = unknown> = (ctx: ClientContext) => R | void;
export type MiddlewareHandler<T = unknown> = (ctx: ClientContext, data: T) => void;
export type MiddlewareWithoutData = (ctx: ClientContext) => void;
export declare class Middleware<T = unknown> {
    route: string;
    fn: MiddlewareHandler<T> | MiddlewareWithoutData;
    constructor(route: string, fn: MiddlewareHandler<T> | MiddlewareWithoutData);
    match(route: string): boolean;
}
export interface PendingRequest {
    resolve(data: unknown): void;
    reject(error: Error): void;
    timer: ReturnType<typeof setTimeout>;
}
