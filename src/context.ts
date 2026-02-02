import { Client } from "./client";

// 上下文
export class Context {
    private client: Client;
    private state: Map<string, any> = new Map();

    constructor(client: Client) {
        this.client = client;
    }

    getClient(): Client {
        return this.client;
    }

    get(key: string): any {
        return this.state.get(key);
    }

    set(key: string, value: any): void {
        this.state.set(key, value);
    }
}
