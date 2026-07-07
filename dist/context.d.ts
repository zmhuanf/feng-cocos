import { Client } from "./client";
export declare class ClientContext {
    private readonly owner;
    private readonly state;
    constructor(client: Client);
    client(): Client;
    get<T = unknown>(key: string): T | undefined;
    set(key: string, value: unknown): void;
}
