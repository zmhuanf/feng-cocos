import { Client } from "./client";
export declare class Context {
    private client;
    private state;
    constructor(client: Client);
    getClient(): Client;
    get(key: string): any;
    set(key: string, value: any): void;
}
