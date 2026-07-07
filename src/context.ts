import { Client } from "./client";

export class ClientContext {
    private readonly owner: Client;
    private readonly state = new Map<string, unknown>();

    constructor(client: Client) {
        this.owner = client;
    }

    client(): Client {
        return this.owner;
    }

    get<T = unknown>(key: string): T | undefined {
        return this.state.get(key) as T | undefined;
    }

    set(key: string, value: unknown): void {
        this.state.set(key, value);
    }
}
