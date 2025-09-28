import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import {
    FrameworkConfig,
    FrameworkConfigSchema,
    ProviderConfig,
    ResourceProviderConfig,
    ToolProviderConfig,
    PromptProviderConfig,
} from './schema.js';
import { ResourceProvider } from '../providers/abstract/resource-provider.js';
import { ToolProvider } from '../providers/abstract/tool-provider.js';
import { PromptProvider } from '../providers/abstract/prompt-provider.js';
import { createLogger, Logger } from '../../logging.js';

/**
 * Configuration loader for MCP framework
 */
export class ConfigLoader {
    private logger: Logger;

    constructor(logger?: Logger) {
        this.logger = logger || createLogger('config-loader');
    }

    /**
     * Load configuration from a file path
     */
    async loadFromFile(filePath: string): Promise<FrameworkConfig> {
        const absolutePath = path.resolve(filePath);

        if (!fs.existsSync(absolutePath)) {
            throw new Error(`Configuration file not found: ${absolutePath}`);
        }

        const content = fs.readFileSync(absolutePath, 'utf-8');
        const ext = path.extname(absolutePath).toLowerCase();

        let rawConfig: unknown;

        try {
            if (ext === '.json') {
                rawConfig = JSON.parse(content);
            } else if (ext === '.yaml' || ext === '.yml') {
                // For YAML support, we'd need to add a YAML parser dependency
                // For now, we'll throw an error
                throw new Error('YAML configuration files are not yet supported. Please use JSON.');
            } else {
                throw new Error(`Unsupported configuration file format: ${ext}. Supported formats: .json`);
            }
        } catch (error) {
            throw new Error(`Failed to parse configuration file ${absolutePath}: ${error}`);
        }

        return this.parseAndValidate(rawConfig);
    }

    /**
     * Load configuration from a string
     */
    async loadFromString(content: string, format: 'json' | 'yaml' = 'json'): Promise<FrameworkConfig> {
        let rawConfig: unknown;

        try {
            if (format === 'json') {
                rawConfig = JSON.parse(content);
            } else {
                throw new Error('YAML configuration strings are not yet supported. Please use JSON.');
            }
        } catch (error) {
            throw new Error(`Failed to parse configuration string: ${error}`);
        }

        return this.parseAndValidate(rawConfig);
    }

    /**
     * Parse and validate configuration
     */
    private async parseAndValidate(rawConfig: unknown): Promise<FrameworkConfig> {
        // First, validate the basic structure
        const config = FrameworkConfigSchema.parse(rawConfig);

        // Process environment variable interpolation
        const processedConfig = this.interpolateEnvironmentVariables(config);

        // Validate required environment variables
        this.validateRequiredEnvironmentVariables(processedConfig);

        return processedConfig;
    }

    /**
     * Interpolate environment variables in configuration
     */
    private interpolateEnvironmentVariables(config: FrameworkConfig): FrameworkConfig {
        const envVars = config.environment?.variables || {};
        const allEnvVars = { ...process.env, ...envVars };

        // Deep clone and interpolate
        const interpolateValue = (value: any): any => {
            if (typeof value === 'string') {
                // Replace ${VAR_NAME} or $VAR_NAME patterns
                return value.replace(/\$\{([^}]+)\}|\$([A-Z_][A-Z0-9_]*)/g, (match, braced, bare) => {
                    const varName = braced || bare;
                    const envValue = allEnvVars[varName];
                    if (envValue === undefined) {
                        this.logger.warn(`Environment variable ${varName} is not defined`);
                        return match; // Keep original if not found
                    }
                    return envValue;
                });
            } else if (Array.isArray(value)) {
                return value.map(interpolateValue);
            } else if (value && typeof value === 'object') {
                const result: any = {};
                for (const [key, val] of Object.entries(value)) {
                    result[key] = interpolateValue(val);
                }
                return result;
            }
            return value;
        };

        return interpolateValue(config);
    }

    /**
     * Validate required environment variables
     */
    private validateRequiredEnvironmentVariables(config: FrameworkConfig): void {
        const required = config.environment?.required || [];
        const missing: string[] = [];

        for (const varName of required) {
            if (!(varName in process.env)) {
                missing.push(varName);
            }
        }

        if (missing.length > 0) {
            throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
        }
    }

    /**
     * Instantiate providers from configuration
     */
    async instantiateProviders(config: FrameworkConfig): Promise<{
        resourceProviders: ResourceProvider[];
        toolProviders: ToolProvider[];
        promptProviders: PromptProvider[];
    }> {
        const resourceProviders: ResourceProvider[] = [];
        const toolProviders: ToolProvider[] = [];
        const promptProviders: PromptProvider[] = [];

        for (const providerConfig of config.server.providers) {
            if (!providerConfig.enabled) {
                this.logger.info(`Skipping disabled provider: ${providerConfig.name}`);
                continue;
            }

            try {
                const provider = await this.instantiateProvider(providerConfig);
                this.logger.info(`Instantiated provider: ${providerConfig.name} (${providerConfig.type})`);

                switch (providerConfig.type) {
                    case 'resource':
                        resourceProviders.push(provider as ResourceProvider);
                        break;
                    case 'tool':
                        toolProviders.push(provider as ToolProvider);
                        break;
                    case 'prompt':
                        promptProviders.push(provider as PromptProvider);
                        break;
                }
            } catch (error) {
                this.logger.error(error as any, `Failed to instantiate provider ${providerConfig.name}`);
                throw error;
            }
        }

        return { resourceProviders, toolProviders, promptProviders };
    }

    /**
     * Instantiate a single provider
     */
    private async instantiateProvider(config: ProviderConfig): Promise<ResourceProvider | ToolProvider | PromptProvider> {
        // Dynamic import of the module
        let module: any;
        try {
            // Handle relative paths
            const modulePath = config.module.startsWith('.')
                ? path.resolve(process.cwd(), config.module)
                : config.module;

            module = await import(modulePath);
        } catch (error) {
            throw new Error(`Failed to import module ${config.module}: ${error}`);
        }

        // Get the class constructor
        const ClassConstructor = module[config.className];
        if (!ClassConstructor) {
            throw new Error(`Class ${config.className} not found in module ${config.module}`);
        }

        // Instantiate the provider
        try {
            const instance = new ClassConstructor(config.config || {});
            return instance;
        } catch (error) {
            throw new Error(`Failed to instantiate ${config.className}: ${error}`);
        }
    }

    /**
     * Load and instantiate everything from a configuration file
     */
    async loadAndInstantiate(filePath: string): Promise<{
        config: FrameworkConfig;
        providers: {
            resourceProviders: ResourceProvider[];
            toolProviders: ToolProvider[];
            promptProviders: PromptProvider[];
        };
    }> {
        const config = await this.loadFromFile(filePath);
        const providers = await this.instantiateProviders(config);

        return { config, providers };
    }
}