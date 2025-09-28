import { readdirSync, statSync, existsSync } from 'fs';
import { join, resolve, extname } from 'path';
import { pathToFileURL } from 'url';
import { ResourceProvider } from '../providers/abstract/resource-provider.js';
import { ToolProvider } from '../providers/abstract/tool-provider.js';
import { PromptProvider } from '../providers/abstract/prompt-provider.js';
import { Logger } from '../../logging.js';

export interface PluginDiscoveryOptions {
    directories?: string[];
    packages?: string[];
    patterns?: string[];
}

export interface DiscoveredProviders {
    resourceProviders: ResourceProvider[];
    toolProviders: ToolProvider[];
    promptProviders: PromptProvider[];
}

/**
 * Plugin loader for discovering and loading MCP provider classes from directories and packages
 */
export class PluginLoader {
    private logger: Logger;

    constructor(logger: Logger) {
        this.logger = logger;
    }

    /**
     * Discover and load providers from specified directories and packages
     */
    async discoverProviders(options: PluginDiscoveryOptions = {}): Promise<DiscoveredProviders> {
        const { directories = [], packages = [], patterns = ['**/*.provider.{js,ts}', '**/*-provider.{js,ts}'] } = options;

        const result: DiscoveredProviders = {
            resourceProviders: [],
            toolProviders: [],
            promptProviders: []
        };

        // Load from directories
        for (const dir of directories) {
            const providers = await this.loadFromDirectory(dir, patterns);
            this.mergeProviders(result, providers);
        }

        // Load from packages
        for (const packageName of packages) {
            const providers = await this.loadFromPackage(packageName);
            this.mergeProviders(result, providers);
        }

        this.logger.info(`Discovered ${result.resourceProviders.length} resource providers, ${result.toolProviders.length} tool providers, ${result.promptProviders.length} prompt providers`);

        return result;
    }

    /**
     * Load providers from a directory
     */
    private async loadFromDirectory(directory: string, patterns: string[]): Promise<DiscoveredProviders> {
        const result: DiscoveredProviders = {
            resourceProviders: [],
            toolProviders: [],
            promptProviders: []
        };

        if (!existsSync(directory)) {
            this.logger.warn(`Plugin directory does not exist: ${directory}`);
            return result;
        }

        try {
            const files = this.findFiles(directory, patterns);
            this.logger.debug(`Found ${files.length} potential provider files in ${directory}`);

            for (const file of files) {
                try {
                    const providers = await this.loadFromFile(file);
                    this.mergeProviders(result, providers);
                } catch (error) {
                    this.logger.error(`Failed to load providers from ${file}`, error as any);
                }
            }
        } catch (error) {
            this.logger.error(`Failed to scan directory ${directory}`, error as any);
        }

        return result;
    }

    /**
     * Load providers from an NPM package
     */
    private async loadFromPackage(packageName: string): Promise<DiscoveredProviders> {
        try {
            // Try to import the package
            const packageModule = await import(packageName);

            // Look for exported providers
            const providers = this.extractProvidersFromModule(packageModule, packageName);
            this.logger.debug(`Loaded providers from package ${packageName}`);

            return providers;
        } catch (error) {
            this.logger.error(`Failed to load package ${packageName}`, error as any);
            return {
                resourceProviders: [],
                toolProviders: [],
                promptProviders: []
            };
        }
    }

    /**
     * Load providers from a single file
     */
    private async loadFromFile(filePath: string): Promise<DiscoveredProviders> {
        try {
            const fileUrl = pathToFileURL(resolve(filePath));
            const module = await import(fileUrl.href);

            return this.extractProvidersFromModule(module, filePath);
        } catch (error) {
            this.logger.error(`Failed to load module from ${filePath}`, error as any);
            return {
                resourceProviders: [],
                toolProviders: [],
                promptProviders: []
            };
        }
    }

    /**
     * Extract provider instances from a loaded module
     */
    private extractProvidersFromModule(module: any, source: string): DiscoveredProviders {
        const result: DiscoveredProviders = {
            resourceProviders: [],
            toolProviders: [],
            promptProviders: []
        };

        // Check default export
        if (module.default) {
            this.classifyAndAddProvider(module.default, result, `${source}:default`);
        }

        // Check named exports
        for (const [key, value] of Object.entries(module)) {
            if (key !== 'default') {
                this.classifyAndAddProvider(value, result, `${source}:${key}`);
            }
        }

        return result;
    }

    /**
     * Classify and add a provider to the appropriate collection
     */
    private classifyAndAddProvider(
        value: any,
        result: DiscoveredProviders,
        source: string
    ): void {
        // Check if it's a class constructor
        if (typeof value === 'function' && value.prototype) {
            const instance = this.tryInstantiateProvider(value, source);
            if (instance) {
                if (instance instanceof ResourceProvider) {
                    result.resourceProviders.push(instance);
                    this.logger.debug(`Loaded resource provider from ${source}`);
                } else if (instance instanceof ToolProvider) {
                    result.toolProviders.push(instance);
                    this.logger.debug(`Loaded tool provider from ${source}`);
                } else if (instance instanceof PromptProvider) {
                    result.promptProviders.push(instance);
                    this.logger.debug(`Loaded prompt provider from ${source}`);
                }
            }
        }
        // Check if it's already an instance
        else if (value instanceof ResourceProvider) {
            result.resourceProviders.push(value);
            this.logger.debug(`Loaded resource provider instance from ${source}`);
        } else if (value instanceof ToolProvider) {
            result.toolProviders.push(value);
            this.logger.debug(`Loaded tool provider instance from ${source}`);
        } else if (value instanceof PromptProvider) {
            result.promptProviders.push(value);
            this.logger.debug(`Loaded prompt provider instance from ${source}`);
        }
    }

    /**
     * Try to instantiate a provider class
     */
    private tryInstantiateProvider(constructor: new (...args: any[]) => any, source: string): any {
        try {
            // Try to instantiate with no arguments first
            return new constructor();
        } catch (error) {
            // If that fails, try with logger
            try {
                return new constructor(this.logger);
            } catch (secondError) {
                this.logger.warn(`Could not instantiate provider from ${source}: ${error instanceof Error ? error.message : String(error)}`);
                return null;
            }
        }
    }

    /**
     * Find files matching patterns in a directory
     */
    private findFiles(directory: string, patterns: string[]): string[] {
        const files: string[] = [];

        const walkDirectory = (dir: string) => {
            const items = readdirSync(dir);

            for (const item of items) {
                const fullPath = join(dir, item);
                const stat = statSync(fullPath);

                if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
                    walkDirectory(fullPath);
                } else if (stat.isFile()) {
                    if (this.matchesPatterns(fullPath, patterns)) {
                        files.push(fullPath);
                    }
                }
            }
        };

        walkDirectory(directory);
        return files;
    }

    /**
     * Check if a file path matches any of the given patterns
     */
    private matchesPatterns(filePath: string, patterns: string[]): boolean {
        const ext = extname(filePath);

        // Basic check for TypeScript/JavaScript files
        if (!['.js', '.ts', '.mjs', '.cjs'].includes(ext)) {
            return false;
        }

        // Simple pattern matching (could be enhanced with glob matching)
        const fileName = filePath.toLowerCase();
        return patterns.some(pattern =>
            fileName.includes('provider') ||
            pattern.split(',').some(p => fileName.includes(p.replace('**/*', '').replace('.{js,ts}', '')))
        );
    }

    /**
     * Merge provider collections
     */
    private mergeProviders(target: DiscoveredProviders, source: DiscoveredProviders): void {
        target.resourceProviders.push(...source.resourceProviders);
        target.toolProviders.push(...source.toolProviders);
        target.promptProviders.push(...source.promptProviders);
    }
}