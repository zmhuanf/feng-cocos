export declare enum RequestType {
    REQUEST = 0,
    PUSH = 1,
    REQUEST_BACK = 2,
    PUSH_BACK = 3,
    SYSTEM = 4
}
export interface Request {
    route: string;
    id: string;
    type: RequestType;
    data: string;
    success?: boolean;
}
export declare class Middleware {
    route: string;
    fn: any;
    constructor(route: string, fn: any);
}
export declare class ResponseHandler {
    resolve: (data: any) => void;
    reject: (error: Error) => void;
    constructor(resolve: (data: any) => void, reject: (error: Error) => void);
}
