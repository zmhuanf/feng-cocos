"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.callFunction = callFunction;
function callFunction(fn, ctx, data) {
    try {
        if (typeof fn !== "function") {
            return { success: false, error: "handler must be a function" };
        }
        const codec = ctx.client().config.codec;
        const payload = codec.unmarshal(data);
        const result = fn.length <= 1 ? fn(ctx) : fn(ctx, payload);
        if (result === undefined || result === null) {
            return { success: true, data: "" };
        }
        return { success: true, data: codec.marshal(result) };
    }
    catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "unknown handler error",
        };
    }
}
//# sourceMappingURL=func.js.map