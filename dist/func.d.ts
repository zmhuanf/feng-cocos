import { Context } from "./context";
export declare function callFunction(fn: any, ctx: Context, data: string): {
    success: boolean;
    data?: string;
    error?: string;
};
export declare function validateFunction(fn: any): boolean;
