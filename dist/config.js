"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsoleLogger = exports.JsonCodec = exports.Config = exports.ClientMode = void 0;
var ClientMode;
(function (ClientMode) {
    ClientMode[ClientMode["Client"] = 0] = "Client";
    ClientMode[ClientMode["Server"] = 1] = "Server";
})(ClientMode || (exports.ClientMode = ClientMode = {}));
class Config {
    constructor() {
        // 服务器地址。
        this.addr = "127.0.0.1";
        // 服务器端口。
        this.port = 22100;
        // 序列化方式。
        this.codec = new JsonCodec();
        // 日志记录器。
        this.logger = new ConsoleLogger();
        // 全局超时时间，单位毫秒。
        this.timeout = 5 * 60 * 1000;
        // 是否启用 TLS。
        this.enableTLS = false;
        // 是否直接连接游戏链路。
        this.directConnect = true;
        // 客户端连接模式。
        this.mode = ClientMode.Client;
    }
}
exports.Config = Config;
class JsonCodec {
    marshal(data) {
        if (data === undefined || data === null) {
            return "";
        }
        if (typeof data === "string") {
            return data;
        }
        if (data instanceof Uint8Array) {
            return new TextDecoder().decode(data);
        }
        return JSON.stringify(data);
    }
    unmarshal(data) {
        if (data === "") {
            return "";
        }
        try {
            return JSON.parse(data);
        }
        catch {
            return data;
        }
    }
}
exports.JsonCodec = JsonCodec;
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