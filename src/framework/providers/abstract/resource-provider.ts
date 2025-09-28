import { z } from 'zod';
import { Resource, ResourceTemplate } from '../../../types.js';

/**
 * Configuration for a resource provider
 */
export interface ResourceProviderConfig {
    name: string;
    description?: string;
    [key: string]: any;
}

/**
 * Abstract base class for resource providers.
 * Resource providers handle MCP resource requests and return resource content.
 */
export abstract class ResourceProvider {
    protected config: ResourceProviderConfig;

    constructor(config: ResourceProviderConfig) {
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
     * Get static resources provided by this provider.
     * Override this method to return static resources.
     */
    getStaticResources(): Resource[] {
        return [];
    }

    /**
     * Get resource templates provided by this provider.
     * Override this method to return dynamic resource templates.
     */
    getResourceTemplates(): ResourceTemplate[] {
        return [];
    }

    /**
     * Handle a resource read request.
     * @param uri The URI of the resource to read
     * @param params Extracted parameters from the URI template (if applicable)
     * @returns Promise resolving to resource content
     */
    abstract readResource(uri: string, params?: Record<string, any>): Promise<{
        contents: Array<{
            uri: string;
            text?: string;
            blob?: string;
            mimeType?: string;
        }>;
    }>;

    /**
     * Validate provider configuration
     */
    validateConfig(): void {
        if (!this.config.name) {
            throw new Error('Resource provider name is required');
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