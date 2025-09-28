import { z } from 'zod';
import { Prompt } from '../../../types.js';

/**
 * Configuration for a prompt provider
 */
export interface PromptProviderConfig {
    name: string;
    description?: string;
    [key: string]: any;
}

/**
 * Abstract base class for prompt providers.
 * Prompt providers handle MCP prompt requests and return prompt templates.
 */
export abstract class PromptProvider {
    protected config: PromptProviderConfig;

    constructor(config: PromptProviderConfig) {
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
     * Get prompts provided by this provider.
     * Override this method to return the list of prompts.
     */
    abstract getPrompts(): Prompt[];

    /**
     * Handle a prompt get request.
     * @param promptName The name of the prompt to retrieve
     * @param args The arguments passed to the prompt template
     * @returns Promise resolving to prompt content
     */
    abstract getPrompt(promptName: string, args?: Record<string, any>): Promise<{
        description?: string;
        messages: Array<{
            role: 'user' | 'assistant' | 'system';
            content: {
                type: 'text' | 'image';
                text?: string;
                data?: string;
                mimeType?: string;
            };
        }>;
    }>;

    /**
     * Validate provider configuration
     */
    validateConfig(): void {
        if (!this.config.name) {
            throw new Error('Prompt provider name is required');
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