import { ResourceProvider } from '../providers/abstract/resource-provider.js';
import { ToolProvider } from '../providers/abstract/tool-provider.js';
import { PromptProvider } from '../providers/abstract/prompt-provider.js';

/**
 * Registry for managing MCP providers
 */
export class ProviderRegistry {
    private resourceProviders: Map<string, ResourceProvider> = new Map();
    private toolProviders: Map<string, ToolProvider> = new Map();
    private promptProviders: Map<string, PromptProvider> = new Map();

    /**
     * Register a resource provider
     */
    registerResourceProvider(provider: ResourceProvider): void {
        if (this.resourceProviders.has(provider.name)) {
            throw new Error(`Resource provider '${provider.name}' is already registered`);
        }
        this.resourceProviders.set(provider.name, provider);
    }

    /**
     * Register a tool provider
     */
    registerToolProvider(provider: ToolProvider): void {
        if (this.toolProviders.has(provider.name)) {
            throw new Error(`Tool provider '${provider.name}' is already registered`);
        }
        this.toolProviders.set(provider.name, provider);
    }

    /**
     * Register a prompt provider
     */
    registerPromptProvider(provider: PromptProvider): void {
        if (this.promptProviders.has(provider.name)) {
            throw new Error(`Prompt provider '${provider.name}' is already registered`);
        }
        this.promptProviders.set(provider.name, provider);
    }

    /**
     * Unregister a resource provider
     */
    unregisterResourceProvider(name: string): boolean {
        return this.resourceProviders.delete(name);
    }

    /**
     * Unregister a tool provider
     */
    unregisterToolProvider(name: string): boolean {
        return this.toolProviders.delete(name);
    }

    /**
     * Unregister a prompt provider
     */
    unregisterPromptProvider(name: string): boolean {
        return this.promptProviders.delete(name);
    }

    /**
     * Get a resource provider by name
     */
    getResourceProvider(name: string): ResourceProvider | undefined {
        return this.resourceProviders.get(name);
    }

    /**
     * Get a tool provider by name
     */
    getToolProvider(name: string): ToolProvider | undefined {
        return this.toolProviders.get(name);
    }

    /**
     * Get a prompt provider by name
     */
    getPromptProvider(name: string): PromptProvider | undefined {
        return this.promptProviders.get(name);
    }

    /**
     * Get all resource providers
     */
    getAllResourceProviders(): ResourceProvider[] {
        return Array.from(this.resourceProviders.values());
    }

    /**
     * Get all tool providers
     */
    getAllToolProviders(): ToolProvider[] {
        return Array.from(this.toolProviders.values());
    }

    /**
     * Get all prompt providers
     */
    getAllPromptProviders(): PromptProvider[] {
        return Array.from(this.promptProviders.values());
    }

    /**
     * Check if a resource provider exists
     */
    hasResourceProvider(name: string): boolean {
        return this.resourceProviders.has(name);
    }

    /**
     * Check if a tool provider exists
     */
    hasToolProvider(name: string): boolean {
        return this.toolProviders.has(name);
    }

    /**
     * Check if a prompt provider exists
     */
    hasPromptProvider(name: string): boolean {
        return this.promptProviders.has(name);
    }

    /**
     * Clear all providers
     */
    clear(): void {
        this.resourceProviders.clear();
        this.toolProviders.clear();
        this.promptProviders.clear();
    }

    /**
     * Get registry statistics
     */
    getStats(): {
        resourceProviders: number;
        toolProviders: number;
        promptProviders: number;
        total: number;
    } {
        const resourceProviders = this.resourceProviders.size;
        const toolProviders = this.toolProviders.size;
        const promptProviders = this.promptProviders.size;

        return {
            resourceProviders,
            toolProviders,
            promptProviders,
            total: resourceProviders + toolProviders + promptProviders
        };
    }
}