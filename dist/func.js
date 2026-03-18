"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.callFunction = callFunction;
exports.validateFunction = validateFunction;
// 调用函数
function callFunction(fn, ctx, data) {
    try {
        if (!validateFunction(fn)) {
            return { success: false, error: 'Function is not valid' };
        }
        // 解析数据
        const codec = ctx.getClient().config.codec;
        let parsedData;
        try {
            parsedData = codec.unmarshal(data);
        }
        catch (parseError) {
            // 如果解析失败，直接作为字符串处理
            parsedData = data;
        }
        // 调用函数
        let result;
        switch (fn.length) {
            case 1:
                result = fn(ctx);
                break;
            case 2:
                result = fn(ctx, parsedData);
                break;
        }
        // 处理返回值
        if (result !== undefined && result !== null) {
            if (typeof result == 'string') {
                return { success: true, data: result };
            }
            else {
                try {
                    const resultData = codec.marshal(result);
                    return { success: true, data: resultData };
                }
                catch (marshalError) {
                    return { success: false, error: 'Failed to marshal result' };
                }
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
// 验证函数是否合法
function validateFunction(fn) {
    if (typeof fn !== 'function') {
        return false;
    }
    const expectedArgs = fn.length;
    return expectedArgs === 1 || expectedArgs === 2;
}
//# sourceMappingURL=func.js.map