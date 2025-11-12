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
    callFunction(fn: any, ctx: context.IContext, data: string): {
        success: boolean;
        data?: string;
        error?: string;
    };
    createContext(client: types.IClient): context.IContext;
    Context: typeof context.Context;
    JsonCodec: typeof config.JsonCodec;
    ConsoleLogger: typeof config.ConsoleLogger;
    DefaultConfig: typeof config.DefaultConfig;
    createClient(config?: Partial<config.IConfig>): types.IClient;
    Client: typeof client.Client;
};
export default _default;
