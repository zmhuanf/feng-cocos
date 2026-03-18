import * as client from './client';
import * as config from './config';
import * as context from './context';
import * as types from './types';
export * from './client';
export * from './config';
export * from './context';
export * from './func';
export * from './types';
declare const _default: {
    RequestType: typeof types.RequestType;
    Middleware: typeof types.Middleware;
    ResponseHandler: typeof types.ResponseHandler;
    callFunction(fn: any, ctx: context.Context, data: string): {
        success: boolean;
        data?: string;
        error?: string;
    };
    validateFunction(fn: any): boolean;
    Context: typeof context.Context;
    Config: typeof config.Config;
    JsonCodec: typeof config.JsonCodec;
    ConsoleLogger: typeof config.ConsoleLogger;
    Client: typeof client.Client;
};
export default _default;
