import { z } from 'zod';

/**
 * Configuration schema for MCP framework
 */

// Base provider configuration
export const BaseProviderConfigSchema = z.object({
    name: z.string().min(1, 'Provider name is required'),
    type: z.enum(['resource', 'tool', 'prompt']).describe('Provider type must be resource, tool, or prompt'),
    enabled: z.boolean().default(true),
    description: z.string().optional(),
});

// Resource provider configuration
export const ResourceProviderConfigSchema = BaseProviderConfigSchema.extend({
    type: z.literal('resource'),
    module: z.string().min(1, 'Module path is required'),
    className: z.string().min(1, 'Class name is required'),
    config: z.record(z.string(), z.any()).optional(),
});

// Tool provider configuration
export const ToolProviderConfigSchema = BaseProviderConfigSchema.extend({
    type: z.literal('tool'),
    module: z.string().min(1, 'Module path is required'),
    className: z.string().min(1, 'Class name is required'),
    config: z.record(z.string(), z.any()).optional(),
});

// Prompt provider configuration
export const PromptProviderConfigSchema = BaseProviderConfigSchema.extend({
    type: z.literal('prompt'),
    module: z.string().min(1, 'Module path is required'),
    className: z.string().min(1, 'Class name is required'),
    config: z.record(z.string(), z.any()).optional(),
});

// Union of all provider configurations
export const ProviderConfigSchema = z.discriminatedUnion('type', [
    ResourceProviderConfigSchema,
    ToolProviderConfigSchema,
    PromptProviderConfigSchema,
]);

// Server configuration
export const ServerConfigSchema = z.object({
    name: z.string().min(1, 'Server name is required'),
    version: z.string().min(1, 'Server version is required'),
    description: z.string().optional(),
    protocolVersion: z.string().default('2024-11-05'),

    // Provider configurations
    providers: z.array(ProviderConfigSchema).default([]),

    // Server settings
    settings: z.object({
        logLevel: z.enum(['debug', 'info', 'warn', 'error', 'silent']).default('info'),
        enableHealthChecks: z.boolean().default(true),
        maxConcurrentRequests: z.number().positive().default(10),
        requestTimeout: z.number().positive().default(30000), // 30 seconds
    }).default(() => ({
        logLevel: 'info' as const,
        enableHealthChecks: true,
        maxConcurrentRequests: 10,
        requestTimeout: 30000,
    })),

    // Transport configuration
    transport: z.object({
        type: z.enum(['stdio', 'http', 'websocket']).default('stdio'),
        stdio: z.object({
            encoding: z.enum(['utf8', 'buffer']).default('utf8'),
        }).optional(),
        http: z.object({
            port: z.number().positive().default(3000),
            host: z.string().default('localhost'),
            path: z.string().default('/mcp'),
        }).optional(),
        websocket: z.object({
            port: z.number().positive().default(3001),
            host: z.string().default('localhost'),
            path: z.string().default('/mcp'),
        }).optional(),
    }).default(() => ({
        type: 'stdio' as const,
    })),
});

// Environment variable interpolation schema
export const EnvironmentConfigSchema = z.object({
    variables: z.record(z.string(), z.string()).optional(),
    required: z.array(z.string()).default([]),
});

// Complete configuration schema
export const FrameworkConfigSchema = z.object({
    server: ServerConfigSchema,
    environment: EnvironmentConfigSchema.optional(),
});

// Type exports
export type BaseProviderConfig = z.infer<typeof BaseProviderConfigSchema>;
export type ResourceProviderConfig = z.infer<typeof ResourceProviderConfigSchema>;
export type ToolProviderConfig = z.infer<typeof ToolProviderConfigSchema>;
export type PromptProviderConfig = z.infer<typeof PromptProviderConfigSchema>;
export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;
export type ServerConfig = z.infer<typeof ServerConfigSchema>;
export type EnvironmentConfig = z.infer<typeof EnvironmentConfigSchema>;
export type FrameworkConfig = z.infer<typeof FrameworkConfigSchema>;