import { FrameworkServer } from './server/framework-server.js';
import { ResourceProvider } from './providers/abstract/resource-provider.js';
import { ToolProvider } from './providers/abstract/tool-provider.js';
import { PromptProvider } from './providers/abstract/prompt-provider.js';
import { ConfigLoader } from './config/loader.js';
import { FrameworkConfig } from './config/schema.js';
import { createLogger, Logger } from '../logging.js';

/**
 * Builder pattern for constructing MCP framework servers
 */
export class FrameworkServerBuilder {
    private config: {
        name?: string;
        version?: string;
        description?: string;
        protocolVersion?: string;
        settings?: Partial<FrameworkConfig['server']['settings']>;
        transport?: FrameworkConfig['server']['transport'];
    } = {};
    private resourceProviders: ResourceProvider[] = [];
    private toolProviders: ToolProvider[] = [];
    private promptProviders: PromptProvider[] = [];
    private logger?: Logger;
    private configLoader?: ConfigLoader;

    /**
     * Create a new builder instance
     */
    static create(): FrameworkServerBuilder {
        return new FrameworkServerBuilder();
    }

    /**
     * Load configuration from a file
     */
    fromConfig(filePath: string): FrameworkServerBuilder {
        this.configLoader = new ConfigLoader(this.logger);
        // We'll load this when building
        this.configLoader.loadFromFile(filePath).then(loadedConfig => {
            this.config = loadedConfig.server;
            // Note: Provider instantiation will happen during build
        }).catch(error => {
            throw new Error(`Failed to load config from ${filePath}: ${error}`);
        });
        return this;
    }

    /**
     * Set server metadata
     */
    withName(name: string): FrameworkServerBuilder {
        this.config.name = name;
        return this;
    }

    withVersion(version: string): FrameworkServerBuilder {
        this.config.version = version;
        return this;
    }

    withDescription(description: string): FrameworkServerBuilder {
        this.config.description = description;
        return this;
    }

    withProtocolVersion(version: string): FrameworkServerBuilder {
        this.config.protocolVersion = version;
        return this;
    }

    /**
     * Configure server settings
     */
    withSettings(settings: Partial<FrameworkConfig['server']['settings']>): FrameworkServerBuilder {
        this.config.settings = { ...this.config.settings, ...settings };
        return this;
    }

    withLogLevel(level: 'debug' | 'info' | 'warn' | 'error' | 'silent'): FrameworkServerBuilder {
        this.config.settings = {
            ...this.config.settings,
            logLevel: level
        };
        return this;
    }

    withHealthChecks(enabled: boolean): FrameworkServerBuilder {
        this.config.settings = {
            ...this.config.settings,
            enableHealthChecks: enabled
        };
        return this;
    }

    withMaxConcurrentRequests(max: number): FrameworkServerBuilder {
        this.config.settings = {
            ...this.config.settings,
            maxConcurrentRequests: max
        };
        return this;
    }

    withRequestTimeout(timeout: number): FrameworkServerBuilder {
        this.config.settings = {
            ...this.config.settings,
            requestTimeout: timeout
        };
        return this;
    }

    /**
     * Configure transport
     */
    withStdioTransport(): FrameworkServerBuilder {
        this.config.transport = {
            type: 'stdio'
        };
        return this;
    }

    withHttpTransport(port?: number, host?: string): FrameworkServerBuilder {
        this.config.transport = {
            type: 'http',
            http: {
                port: port || 3000,
                host: host || 'localhost',
                path: '/mcp'
            }
        };
        return this;
    }

    withWebSocketTransport(port?: number, host?: string): FrameworkServerBuilder {
        this.config.transport = {
            type: 'websocket',
            websocket: {
                port: port || 3001,
                host: host || 'localhost',
                path: '/mcp'
            }
        };
        return this;
    }

    /**
     * Add providers
     */
    addResourceProvider(provider: ResourceProvider): FrameworkServerBuilder {
        this.resourceProviders.push(provider);
        return this;
    }

    addToolProvider(provider: ToolProvider): FrameworkServerBuilder {
        this.toolProviders.push(provider);
        return this;
    }

    addPromptProvider(provider: PromptProvider): FrameworkServerBuilder {
        this.promptProviders.push(provider);
        return this;
    }

    /**
     * Add multiple providers at once
     */
    addResourceProviders(providers: ResourceProvider[]): FrameworkServerBuilder {
        this.resourceProviders.push(...providers);
        return this;
    }

    addToolProviders(providers: ToolProvider[]): FrameworkServerBuilder {
        this.toolProviders.push(...providers);
        return this;
    }

    addPromptProviders(providers: PromptProvider[]): FrameworkServerBuilder {
        this.promptProviders.push(...providers);
        return this;
    }

    /**
     * Set custom logger
     */
    withLogger(logger: Logger): FrameworkServerBuilder {
        this.logger = logger;
        return this;
    }

    /**
     * Build the framework server
     */
    async build(): Promise<FrameworkServer> {
        // Merge configuration with defaults
        const finalConfig = {
            name: this.config.name || 'MCP Framework Server',
            version: this.config.version || '1.0.0',
            description: this.config.description,
            protocolVersion: this.config.protocolVersion || '2024-11-05',
            providers: [], // We'll register providers manually
            settings: {
                logLevel: 'info' as const,
                enableHealthChecks: true,
                maxConcurrentRequests: 10,
                requestTimeout: 30000,
                ...this.config.settings
            },
            transport: this.config.transport || { type: 'stdio' as const }
        };

        // Create logger
        const logger = this.logger || createLogger('framework-server');

        // Create server instance
        const server = new FrameworkServer({
            ...finalConfig,
            logger
        });

        // Register providers
        for (const provider of this.resourceProviders) {
            server.registerResourceProvider(provider);
        }

        for (const provider of this.toolProviders) {
            server.registerToolProvider(provider);
        }

        for (const provider of this.promptProviders) {
            server.registerPromptProvider(provider);
        }

        return server;
    }

    /**
     * Build and start the server
     */
    async buildAndStart(): Promise<FrameworkServer> {
        const server = await this.build();
        await server.start();
        return server;
    }
}

/**
 * Convenience functions for common patterns
 */

/**
 * Create a basic stdio server
 */
export function createStdioServer(name: string, version: string = '1.0.0'): FrameworkServerBuilder {
    return FrameworkServerBuilder.create()
        .withName(name)
        .withVersion(version)
        .withStdioTransport();
}

/**
 * Create an HTTP server
 */
export function createHttpServer(
    name: string,
    port: number = 3000,
    version: string = '1.0.0'
): FrameworkServerBuilder {
    return FrameworkServerBuilder.create()
        .withName(name)
        .withVersion(version)
        .withHttpTransport(port);
}

/**
 * Create a WebSocket server
 */
export function createWebSocketServer(
    name: string,
    port: number = 3001,
    version: string = '1.0.0'
): FrameworkServerBuilder {
    return FrameworkServerBuilder.create()
        .withName(name)
        .withVersion(version)
        .withWebSocketTransport(port);
}

/**
 * Load server from configuration file
 */
export async function loadFromConfig(filePath: string): Promise<FrameworkServerBuilder> {
    const builder = FrameworkServerBuilder.create();
    await builder.fromConfig(filePath);
    return builder;
}