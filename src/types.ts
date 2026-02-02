// 请求类型枚举
export enum RequestType {
  REQUEST = 0,
  PUSH = 1,
  REQUEST_BACK = 2,
  PUSH_BACK = 3,
  SYSTEM = 4
}

// 请求数据结构
export interface Request {
  route: string;
  id: string;
  type: RequestType;
  data: string;
  success?: boolean;
}

// 中间件
export class Middleware {
  route: string;
  fn: any;

  constructor(route: string, fn: any) {
    this.route = route;
    this.fn = fn;
  }
}

// 响应处理器
export class ResponseHandler {
  resolve: (data: any) => void;
  reject: (error: Error) => void;

  constructor(resolve: (data: any) => void, reject: (error: Error) => void) {
    this.resolve = resolve;
    this.reject = reject;
  }
}
