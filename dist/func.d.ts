import { ClientContext } from "./context";
import { Handler, HandlerWithoutData, MiddlewareHandler, MiddlewareWithoutData } from "./types";
export declare function callFunction(fn: Handler | HandlerWithoutData | MiddlewareHandler | MiddlewareWithoutData, ctx: ClientContext, data: string): {
    success: boolean;
    data?: string;
    error?: string;
};
