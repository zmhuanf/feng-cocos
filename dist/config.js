"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsoleLogger = exports.JsonCodec = exports.Config = void 0;
// 客户端配置
class Config {
    constructor() {
        // 服务器地址
        this.addr = "127.0.0.1";
        // 服务器端口
        this.port = 22100;
        // 序列化方式
        this.codec = new JsonCodec();
        // 日志记录器
        this.logger = new ConsoleLogger();
        // 全局超时时间（毫秒）
        this.timeout = 5 * 60 * 1000;
        // 启用TLS
        this.enableTLS = false;
    }
}
exports.Config = Config;
// JSON序列化器
class JsonCodec {
    marshal(data) {
        if (data == "") {
            return "";
        }
        return JSON.stringify(data);
    }
    unmarshal(data) {
        if (data == "") {
            return "";
        }
        return JSON.parse(data);
    }
}
exports.JsonCodec = JsonCodec;
// 控制台日志记录器
class ConsoleLogger {
    debug(message, ...args) {
        console.debug(`[DEBUG] ${message}`, ...args);
    }
    info(message, ...args) {
        console.info(`[INFO] ${message}`, ...args);
    }
    warn(message, ...args) {
        console.warn(`[WARN] ${message}`, ...args);
    }
    error(message, ...args) {
        console.error(`[ERROR] ${message}`, ...args);
    }
}
exports.ConsoleLogger = ConsoleLogger;
//# sourceMappingURL=config.js.map