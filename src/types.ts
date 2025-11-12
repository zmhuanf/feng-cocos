import { IConfig } from "./config";

/**
 * 请求类型枚举
 */
export enum RequestType {
  REQUEST = 0,
  PUSH = 1,
  REQUEST_BACK = 2,
  PUSH_BACK = 3,
  SYSTEM = 4
}

/**
 * 请求数据结构
 */
export interface Request {
  route: string;
  id: string;
  type: RequestType;
  data: string;
  success?: boolean;
}

/**
 * 中间件定义
 */
export interface Middleware {
  route: string;
  fn: (ctx: any, data: any) => void;
}

/**
 * 响应处理器定义
 */
export interface ResponseHandler {
  resolve: (data: any) => void;
  reject: (error: Error) => void;
}

/**
 * 客户端接口
 */
export interface IClient {
  /** 添加路由处理器 */
  addHandler(route: string, handler: any): void;
  
  /** 添加中间件 */
  addMiddleware(route: string, middleware: any): void;
  
  /** 连接服务器 */
  connect(): Promise<void>;
  
  /** 推送消息 */
  push(route: string, data: any): void;
  
  /** 异步请求 */
  request(route: string, data: any): Promise<any>;
  
  /** 获取配置 */
  getConfig(): IConfig;
  
  /** 关闭连接 */
  close(): void;
}