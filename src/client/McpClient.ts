import { Logger } from '../logging.js';

export interface McpClientConfig {
    serverUrl: string;
    logger?: Logger;
}

export class McpClient {
    private serverUrl: string;
    private logger?: Logger;

    constructor(config: McpClientConfig) {
        this.serverUrl = config.serverUrl;
        this.logger = config.logger;
    }

    async connect(): Promise<void> {
        // TODO: implement transport negotiation and capability negotiation
        if (this.logger) this.logger.info(`Connecting to ${this.serverUrl}`);
    }

    async samplingCreate(params: any): Promise<any> {
        // TODO: implement sampling create request
        return { ok: true };
    }
}
