import { z } from 'zod';

/**
 * Shared types for MCP servers and tools
 */

// JSON-RPC handler types
export interface RpcHandlers {
    [method: string]: (params: any) => Promise<any>;
}

// Tool schema types
export interface ToolSchema {
    name: string;
    description: string;
    inputSchema: z.ZodSchema;
}

// Resource types
export interface Resource {
    uri: string;
    name: string;
    description?: string;
    mimeType?: string;
}

export interface ResourceTemplate {
    uriTemplate: string;
    name: string;
    description?: string;
    mimeType?: string;
}

// MCP protocol types
export interface McpServerInfo {
    name: string;
    version: string;
    protocolVersion: string;
}

export interface Tool {
    name: string;
    description: string;
    inputSchema: Record<string, any>;
}

export interface Prompt {
    name: string;
    description: string;
    arguments?: Array<{
        name: string;
        description: string;
        required?: boolean;
    }>;
}

// Transport types
export interface TransportConfig {
    framing?: boolean;
    maxMessageSize?: number;
}

export interface RequestContext {
    id: string | number;
    method: string;
    params?: any;
}