import { ClientTransport } from './transports/client-transport.js';
import { SamplingOptions, SamplingResult } from './sampling.js';
import { JsonRpcMessage, McpInitializeRequest, McpInitializeResponse } from '../jsonrpc.js';
import { createLogger, Logger } from '../logging.js';

/**
 * MCP client for connecting to MCP servers
 */
export class McpClient {
    private transport: ClientTransport;
    private logger: Logger;
    private initialized = false;
    private nextId = 1;
    private pendingRequests = new Map<string | number, { resolve: (value: any) => void; reject: (error: any) => void }>();

    constructor(
        transport: ClientTransport,
        options: { logger?: Logger; clientInfo?: { name: string; version: string } } = {}
    ) {
        this.transport = transport;
        this.logger = options.logger || createLogger({ name: 'mcp-client' });
    }

    /**
     * Connect to the MCP server
     */
    async connect(): Promise<void> {
        await this.transport.connect();
        this.logger.info('Connected to MCP server');
    }

    /**
     * Disconnect from the MCP server
     */
    async disconnect(): Promise<void> {
        await this.transport.disconnect();
        this.logger.info('Disconnected from MCP server');
    }

    /**
     * Initialize the connection with the server
     */
    async initialize(options: {
        protocolVersion?: string;
        capabilities?: {
            sampling?: {};
        };
        clientInfo?: { name: string; version: string };
    } = {}): Promise<McpInitializeResponse['result']> {
        const request: McpInitializeRequest = {
            jsonrpc: '2.0',
            id: this.nextId++,
            method: 'initialize',
            params: {
                protocolVersion: options.protocolVersion || '2024-11-05',
                capabilities: options.capabilities || {},
                clientInfo: options.clientInfo || { name: 'mcp-client', version: '1.0.0' }
            }
        };

        const response = await this.sendRequest(request);
        this.initialized = true;
        this.logger.info('MCP client initialized', { serverInfo: response.serverInfo });
        return response;
    }

    /**
     * List available tools
     */
    async listTools(): Promise<{ tools: Array<{ name: string; description: string; inputSchema: any }> }> {
        const response = await this.sendRequest({
            jsonrpc: '2.0',
            id: this.nextId++,
            method: 'tools/list'
        });
        return response;
    }

    /**
     * Call a tool
     */
    async callTool(name: string, args: Record<string, any> = {}): Promise<any> {
        const response = await this.sendRequest({
            jsonrpc: '2.0',
            id: this.nextId++,
            method: 'tools/call',
            params: { name, arguments: args }
        });
        return response;
    }

    /**
     * List available resources
     */
    async listResources(): Promise<{ resources: Array<{ uri: string; name: string; description?: string; mimeType?: string }> }> {
        const response = await this.sendRequest({
            jsonrpc: '2.0',
            id: this.nextId++,
            method: 'resources/list'
        });
        return response;
    }

    /**
     * Read a resource
     */
    async readResource(uri: string): Promise<{ contents: Array<{ uri: string; mimeType?: string; text?: string; blob?: string }> }> {
        const response = await this.sendRequest({
            jsonrpc: '2.0',
            id: this.nextId++,
            method: 'resources/read',
            params: { uri }
        });
        return response;
    }

    /**
     * List available prompts
     */
    async listPrompts(): Promise<{ prompts: any[] }> {
        const response = await this.sendRequest({
            jsonrpc: '2.0',
            id: this.nextId++,
            method: 'prompts/list'
        });
        return response;
    }

    /**
     * Get a prompt
     */
    async getPrompt(name: string, args?: Record<string, any>): Promise<any> {
        const response = await this.sendRequest({
            jsonrpc: '2.0',
            id: this.nextId++,
            method: 'prompts/get',
            params: { name, arguments: args }
        });
        return response;
    }

    /**
     * Sample content from the server (if supported)
     */
    async sample(options: SamplingOptions): Promise<SamplingResult> {
        const response = await this.sendRequest({
            jsonrpc: '2.0',
            id: this.nextId++,
            method: 'sampling/createMessage',
            params: options
        });
        return response;
    }

    /**
     * Send a JSON-RPC request and wait for response
     */
    private async sendRequest(request: any): Promise<any> {
        return new Promise(async (resolve, reject) => {
            const id = request.id;
            this.pendingRequests.set(id, { resolve, reject });

            try {
                await this.transport.send(request);
            } catch (error) {
                this.pendingRequests.delete(id);
                reject(error);
            }
        });
    }

    /**
     * Start listening for responses
     */
    async startListening(): Promise<void> {
        while (this.transport.isConnected()) {
            try {
                const message = await this.transport.receive();
                this.handleMessage(message);
            } catch (error) {
                this.logger.error('Error receiving message', error as any);
                break;
            }
        }
    }

    /**
     * Handle incoming JSON-RPC messages
     */
    private handleMessage(message: JsonRpcMessage): void {
        if ('id' in message && message.id !== null && message.id !== undefined) {
            const pending = this.pendingRequests.get(message.id);
            if (pending) {
                this.pendingRequests.delete(message.id);
                if ('error' in message) {
                    pending.reject(message.error);
                } else if ('result' in message) {
                    pending.resolve((message as any).result);
                }
            }
        }
        // Handle notifications if needed
    }
}