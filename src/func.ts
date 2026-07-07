import { ClientContext } from "./context";
import { Handler, HandlerWithoutData, MiddlewareHandler, MiddlewareWithoutData } from "./types";

export function callFunction(
    fn: Handler | HandlerWithoutData | MiddlewareHandler | MiddlewareWithoutData,
    ctx: ClientContext,
    data: string,
): { success: boolean; data?: string; error?: string } {
    try {
        if (typeof fn !== "function") {
            return { success: false, error: "handler must be a function" };
        }

        const codec = ctx.client().config.codec;
        const payload = codec.unmarshal(data);
        const result = fn.length <= 1 ? (fn as HandlerWithoutData)(ctx) : (fn as Handler)(ctx, payload);

        if (result === undefined || result === null) {
            return { success: true, data: "" };
        }
        return { success: true, data: codec.marshal(result) };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "unknown handler error",
        };
    }
}
