import { z } from 'zod';
import { Resource, ResourceTemplate } from '../../../types.js';
import { validateMcpUri } from '../../../security.js';
import { validateTemplate } from '../../../resource-template.js';

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
     * URIs are validated against MCP standards (https://, file://, git://).
     */
    getStaticResources(): Resource[] {
        const resources = this.getStaticResourcesImpl();
        this.validateResourceUris(resources);
        return resources;
    }

    /**
     * Internal implementation of getStaticResources.
     * Override this method instead of getStaticResources to avoid validation.
     */
    protected getStaticResourcesImpl(): Resource[] {
        return [];
    }

    /**
     * Get resource templates provided by this provider.
     * Override this method to return dynamic resource templates.
     */
    getResourceTemplates(): ResourceTemplate[] {
        const templates = this.getResourceTemplatesImpl();
        // Validate templates and ensure they conform to expected syntax
        for (const t of templates) {
            if (!t.uriTemplate || typeof t.uriTemplate !== 'string') {
                throw new Error(`Invalid resource template (missing uriTemplate) in provider ${this.name}`);
            }
            if (!validateTemplate(t.uriTemplate)) {
                throw new Error(`Invalid resource template syntax: ${t.uriTemplate} in provider ${this.name}`);
            }
            // Optionally validate resolved URI scheme if template contains no placeholders
            if (!t.uriTemplate.includes('{') && !validateMcpUri(t.uriTemplate)) {
                throw new Error(`Resource template resolves to unsupported URI scheme: ${t.uriTemplate}`);
            }
        }
        return templates;
    }

    /**
     * Internal implementation hook for resource templates.
     * Providers should override this to return templates without validation.
     */
    protected getResourceTemplatesImpl(): ResourceTemplate[] {
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
     * Validate MCP resource URIs against standard schemes
     */
    private validateResourceUris(resources: Resource[]): void {
        for (const resource of resources) {
            if (!validateMcpUri(resource.uri)) {
                throw new Error(`Invalid MCP resource URI: ${resource.uri}. Must use https://, file://, or git:// scheme.`);
            }
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