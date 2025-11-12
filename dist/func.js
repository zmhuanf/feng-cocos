"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.callFunction = callFunction;
function callFunction(fn, ctx, data) {
    try {
        // 检查是否为函数
        if (typeof fn !== 'function') {
            return { success: false, error: 'Handler must be a function' };
        }
        // 获取函数参数数量
        const expectedArgs = fn.length;
        if (expectedArgs !== 2) {
            return { success: false, error: 'Function must have exactly 2 arguments' };
        }
        // 解析数据
        const codec = ctx.getClient().getConfig().codec;
        let parsedData;
        try {
            parsedData = codec.unmarshal(data);
        }
        catch (parseError) {
            // 如果解析失败，尝试作为字符串处理
            parsedData = data;
        }
        // 调用函数
        const result = fn(ctx, parsedData);
        // 处理返回值
        if (result !== undefined && result !== null) {
            try {
                const resultData = codec.marshal(result);
                return { success: true, data: resultData };
            }
            catch (marshalError) {
                return { success: false, error: 'Failed to marshal result' };
            }
        }
        return { success: true };
    }
    catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    }
}
//# sourceMappingURL=func.js.map