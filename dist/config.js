"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultConfig = exports.ConsoleLogger = exports.JsonCodec = void 0;
/**
 * JSON序列化器
 */
class JsonCodec {
    marshal(data) {
        return JSON.stringify(data);
    }
    unmarshal(data) {
        return JSON.parse(data);
    }
}
exports.JsonCodec = JsonCodec;
/**
 * 控制台日志记录器
 */
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
/**
 * 默认客户端配置
 */
class DefaultConfig {
    constructor(config) {
        this.addr = "127.0.0.1";
        this.port = 22100;
        this.codec = new JsonCodec();
        this.logger = new ConsoleLogger();
        this.timeout = 5 * 60 * 1000; // 5分钟
        this.enableTLS = false;
        if (config) {
            Object.assign(this, config);
        }
    }
}
exports.DefaultConfig = DefaultConfig;
//# sourceMappingURL=config.js.map