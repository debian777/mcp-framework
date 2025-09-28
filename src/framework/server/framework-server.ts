import { StdioTransport } from '../../transport/stdio.js';
import { ProviderRegistry } from '../registry/provider-registry.js';
import { ResourceProvider } from '../providers/abstract/resource-provider.js';
import { ToolProvider } from '../providers/abstract/tool-provider.js';
import { PromptProvider } from '../providers/abstract/prompt-provider.js';
import { Resource, ResourceTemplate, Tool, Prompt } from '../../types.js';
import { createLogger, Logger } from '../../logging.js';

/**
 * Configuration for the framework server
 */
export interface FrameworkServerConfig {
    name: string;
    version: string;
    description?: string;
    protocolVersion?: string;
    logger?: Logger;
}

/**
 * Framework server that orchestrates MCP providers
 */
export class FrameworkServer {
    private config: FrameworkServerConfig;
    private registry: ProviderRegistry;
    private logger: Logger;
    private initialized = false;

    constructor(config: FrameworkServerConfig) {
        this.config = {
            protocolVersion: '2024-11-05',
            ...config
        };
        this.registry = new ProviderRegistry();
        this.logger = config.logger || createLogger('framework-server');
    }

    /**
     * Register a resource provider
     */
    registerResourceProvider(provider: ResourceProvider): void {
        this.logger.info(`Registering resource provider: ${provider.name}`);
        this.registry.registerResourceProvider(provider);
    }

    /**
     * Register a tool provider
     */
    registerToolProvider(provider: ToolProvider): void {
        this.logger.info(`Registering tool provider: ${provider.name}`);
        this.registry.registerToolProvider(provider);
    }

    /**
     * Register a prompt provider
     */
    registerPromptProvider(provider: PromptProvider): void {
        this.logger.info(`Registering prompt provider: ${provider.name}`);
        this.registry.registerPromptProvider(provider);
    }

    /**
     * Get all static resources from registered providers
     */
    getStaticResources(): Resource[] {
        const resources: Resource[] = [];
        for (const provider of this.registry.getAllResourceProviders()) {
            resources.push(...provider.getStaticResources());
        }
        return resources;
    }

    /**
     * Get all resource templates from registered providers
     */
    getResourceTemplates(): ResourceTemplate[] {
        const templates: ResourceTemplate[] = [];
        for (const provider of this.registry.getAllResourceProviders()) {
            templates.push(...provider.getResourceTemplates());
        }
        return templates;
    }

    /**
     * Get all tools from registered providers
     */
    getTools(): Tool[] {
        const tools: Tool[] = [];
        for (const provider of this.registry.getAllToolProviders()) {
            tools.push(...provider.getTools());
        }
        return tools;
    }

    /**
     * Get all prompts from registered providers
     */
    getPrompts(): Prompt[] {
        const prompts: Prompt[] = [];
        for (const provider of this.registry.getAllPromptProviders()) {
            prompts.push(...provider.getPrompts());
        }
        return prompts;
    }

    /**
     * Handle resource read requests
     */
    async readResource(uri: string, params?: Record<string, any>): Promise<{
        contents: Array<{
            uri: string;
            text?: string;
            blob?: string;
            mimeType?: string;
        }>;
    }> {
        // Try static resources first
        const staticResource = this.getStaticResources().find(r => r.uri === uri);
        if (staticResource) {
            return {
                contents: [{
                    uri: staticResource.uri,
                    text: staticResource.description || '',
                    mimeType: staticResource.mimeType
                }]
            };
        }

        // Try resource templates
        for (const template of this.getResourceTemplates()) {
            const match = this.matchUriTemplate(uri, template.uriTemplate);
            if (match) {
                const provider = this.registry.getResourceProvider(template.name);
                if (provider) {
                    return provider.readResource(uri, { ...match, ...params });
                }
            }
        }

        throw new Error(`Resource not found: ${uri}`);
    }

    /**
     * Handle tool calls
     */
    async callTool(toolName: string, args: Record<string, any>): Promise<{
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
    }> {
        for (const provider of this.registry.getAllToolProviders()) {
            const tools = provider.getTools();
            const tool = tools.find(t => t.name === toolName);
            if (tool) {
                return provider.callTool(toolName, args);
            }
        }

        throw new Error(`Tool not found: ${toolName}`);
    }

    /**
     * Handle prompt requests
     */
    async getPrompt(promptName: string, args?: Record<string, any>): Promise<{
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
    }> {
        for (const provider of this.registry.getAllPromptProviders()) {
            const prompts = provider.getPrompts();
            const prompt = prompts.find(p => p.name === promptName);
            if (prompt) {
                return provider.getPrompt(promptName, args);
            }
        }

        throw new Error(`Prompt not found: ${promptName}`);
    }

    /**
     * Initialize all registered providers
     */
    async initialize(): Promise<void> {
        if (this.initialized) {
            return;
        }

        this.logger.info('Initializing framework server...');

        // Initialize all providers
        const providers = [
            ...this.registry.getAllResourceProviders(),
            ...this.registry.getAllToolProviders(),
            ...this.registry.getAllPromptProviders()
        ];

        for (const provider of providers) {
            try {
                await provider.initialize();
                this.logger.info(`Initialized provider: ${provider.name}`);
            } catch (error) {
                this.logger.error(error as any, `Failed to initialize provider ${provider.name}`);
                throw error;
            }
        }

        this.initialized = true;
        this.logger.info('Framework server initialized successfully');
    }

    /**
     * Start the server with stdio transport
     */
    async start(): Promise<void> {
        await this.initialize();

        const transport = new StdioTransport(() => {
            // This would need to be implemented to handle MCP requests
            // For now, this is a placeholder
            throw new Error('Direct transport connection not implemented yet');
        });
        await transport.start();
    }

    /**
     * Connect to a transport (for advanced usage)
     */
    async connect(transport: any): Promise<void> {
        await this.initialize();

        // This would integrate with the existing MCP server infrastructure
        // For now, we'll use the existing startJsonRpcServer approach
        this.logger.info(`Starting MCP server: ${this.config.name} v${this.config.version}`);

        // The actual transport connection would be handled by the existing infrastructure
        // This is a placeholder for the integration point
    }

    /**
     * Cleanup all providers
     */
    async cleanup(): Promise<void> {
        this.logger.info('Cleaning up framework server...');

        const providers = [
            ...this.registry.getAllResourceProviders(),
            ...this.registry.getAllToolProviders(),
            ...this.registry.getAllPromptProviders()
        ];

        for (const provider of providers) {
            try {
                await provider.cleanup();
            } catch (error) {
                this.logger.error(error as any, `Error cleaning up provider ${provider.name}`);
            }
        }

        this.initialized = false;
        this.logger.info('Framework server cleanup completed');
    }

    /**
     * Get server information
     */
    getServerInfo(): {
        name: string;
        version: string;
        protocolVersion: string;
        description?: string;
        capabilities: {
            resources?: boolean;
            tools?: boolean;
            prompts?: boolean;
        };
    } {
        const stats = this.registry.getStats();

        return {
            name: this.config.name,
            version: this.config.version,
            protocolVersion: this.config.protocolVersion!,
            description: this.config.description,
            capabilities: {
                resources: stats.resourceProviders > 0,
                tools: stats.toolProviders > 0,
                prompts: stats.promptProviders > 0
            }
        };
    }

    /**
     * Match URI against template pattern
     * Simple implementation - could be enhanced with proper URI template matching
     */
    private matchUriTemplate(uri: string, template: string): Record<string, string> | null {
        // This is a simplified implementation
        // A full implementation would use proper URI template parsing
        if (template.includes('{') && template.includes('}')) {
            // For now, return empty params for dynamic templates
            return {};
        }
        return uri === template ? {} : null;
    }
}