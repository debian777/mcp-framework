import { z } from 'zod';
import { Tool } from '../../../types.js';

/**
 * Configuration for a tool provider
 */
export interface ToolProviderConfig {
    name: string;
    description?: string;
    [key: string]: any;
}

/**
 * Abstract base class for tool providers.
 * Tool providers handle MCP tool calls and execute business logic.
 */
export abstract class ToolProvider {
    protected config: ToolProviderConfig;

    constructor(config: ToolProviderConfig) {
        this.config = config;
    }

    /**
     * Get the provider name
     */
    get name(): string {
        return this.config.name;
    }

    /**
     * Get the provider description
     */
    get description(): string {
        return this.config.description || '';
    }

    /**
     * Get tools provided by this provider.
     * Override this method to return the list of tools.
     */
    abstract getTools(): Tool[];

    /**
     * Handle a tool call request.
     * @param toolName The name of the tool to execute
     * @param args The arguments passed to the tool
     * @returns Promise resolving to tool execution result
     */
    abstract callTool(toolName: string, args: Record<string, any>): Promise<{
        content: Array<{
            type: 'text' | 'image' | 'resource_link';
            text?: string;
            data?: string;
            mimeType?: string;
            uri?: string;
            name?: string;
            description?: string;
        }>;
        isError?: boolean;
    }>;

    /**
     * Validate provider configuration
     */
    validateConfig(): void {
        if (!this.config.name) {
            throw new Error('Tool provider name is required');
        }
    }

    /**
     * Initialize the provider (called once during server startup)
     */
    async initialize(): Promise<void> {
        this.validateConfig();
    }

    /**
     * Cleanup provider resources (called during server shutdown)
     */
    async cleanup(): Promise<void> {
        // Default implementation - override if needed
    }
}