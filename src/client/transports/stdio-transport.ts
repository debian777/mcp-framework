import { spawn } from 'child_process';
import { createInterface } from 'readline';
import { ClientTransport } from './client-transport.js';
import { JsonRpcMessage } from '../../jsonrpc.js';

/**
 * STDIO-based transport for MCP clients
 */
export class StdioClientTransport implements ClientTransport {
    private process?: any;
    private rl?: any;
    private connected = false;
    private messageQueue: JsonRpcMessage[] = [];
    private resolveQueue: Array<(message: JsonRpcMessage) => void> = [];

    constructor(
        private command: string,
        private args: string[] = [],
        private options: { cwd?: string; env?: Record<string, string> } = {}
    ) { }

    async connect(): Promise<void> {
        if (this.connected) {
            return;
        }

        this.process = spawn(this.command, this.args, {
            stdio: ['pipe', 'pipe', 'pipe'],
            cwd: this.options.cwd,
            env: { ...process.env, ...this.options.env }
        });

        this.rl = createInterface({
            input: this.process.stdout,
            crlfDelay: Infinity
        });

        this.rl.on('line', (line: string) => {
            try {
                const message = JSON.parse(line);
                this.handleMessage(message);
            } catch (error) {
                // Invalid JSON - ignore for now
            }
        });

        this.process.on('exit', () => {
            this.connected = false;
        });

        this.connected = true;
    }

    async disconnect(): Promise<void> {
        if (this.process) {
            this.process.kill();
            this.process = undefined;
        }
        if (this.rl) {
            this.rl.close();
            this.rl = undefined;
        }
        this.connected = false;
    }

    async send(message: JsonRpcMessage): Promise<void> {
        if (!this.connected || !this.process) {
            throw new Error('Transport not connected');
        }

        const json = JSON.stringify(message) + '\n';
        this.process.stdin.write(json);
    }

    async receive(): Promise<JsonRpcMessage> {
        if (this.messageQueue.length > 0) {
            return this.messageQueue.shift()!;
        }

        return new Promise((resolve) => {
            this.resolveQueue.push(resolve);
        });
    }

    isConnected(): boolean {
        return this.connected;
    }

    private handleMessage(message: JsonRpcMessage): void {
        if (this.resolveQueue.length > 0) {
            const resolve = this.resolveQueue.shift()!;
            resolve(message);
        } else {
            this.messageQueue.push(message);
        }
    }
}