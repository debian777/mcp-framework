import { z } from 'zod';

/**
 * JSON-RPC 2.0 message schemas for MCP servers
 */

// Base JSON-RPC version
export const JsonRpcVersion = z.literal('2.0');

// JSON-RPC ID (string or number)
export const JsonRpcId = z.union([z.string(), z.number()]);

// JSON-RPC error codes
export const JsonRpcErrorCode = z.number().int().min(-32768).max(-32000);

// JSON-RPC error object
export const JsonRpcError = z.object({
    code: JsonRpcErrorCode,
    message: z.string(),
    data: z.any().optional(),
});

// JSON-RPC request
export const JsonRpcRequest = z.object({
    jsonrpc: JsonRpcVersion,
    id: JsonRpcId,
    method: z.string(),
    params: z.any().optional(),
});

// JSON-RPC response (success)
export const JsonRpcResponse = z.object({
    jsonrpc: JsonRpcVersion,
    id: JsonRpcId,
    result: z.any(),
});

// JSON-RPC response (error)
export const JsonRpcErrorResponse = z.object({
    jsonrpc: JsonRpcVersion,
    id: JsonRpcId,
    error: JsonRpcError,
});

// JSON-RPC notification (no id)
export const JsonRpcNotification = z.object({
    jsonrpc: JsonRpcVersion,
    method: z.string(),
    params: z.any().optional(),
});

// Union of all JSON-RPC messages
export const JsonRpcMessage = z.union([
    JsonRpcRequest,
    JsonRpcResponse,
    JsonRpcErrorResponse,
    JsonRpcNotification,
]);

// Type exports
export type JsonRpcVersion = z.infer<typeof JsonRpcVersion>;
export type JsonRpcId = z.infer<typeof JsonRpcId>;
export type JsonRpcErrorCode = z.infer<typeof JsonRpcErrorCode>;
export type JsonRpcError = z.infer<typeof JsonRpcError>;
export type JsonRpcRequest = z.infer<typeof JsonRpcRequest>;
export type JsonRpcResponse = z.infer<typeof JsonRpcResponse>;
export type JsonRpcErrorResponse = z.infer<typeof JsonRpcErrorResponse>;
export type JsonRpcNotification = z.infer<typeof JsonRpcNotification>;
export type JsonRpcMessage = z.infer<typeof JsonRpcMessage>;

// MCP-specific schemas
export const McpInitializeRequest = z.object({
    jsonrpc: JsonRpcVersion,
    id: JsonRpcId,
    method: z.literal('initialize'),
    params: z.object({
        protocolVersion: z.string(),
        capabilities: z.object({
            tools: z.object({}).optional(),
            resources: z.object({}).optional(),
            prompts: z.object({}).optional(),
        }).optional(),
        clientInfo: z.object({
            name: z.string(),
            version: z.string(),
        }).optional(),
    }),
});

export const McpInitializeResponse = z.object({
    jsonrpc: JsonRpcVersion,
    id: JsonRpcId,
    result: z.object({
        protocolVersion: z.string(),
        capabilities: z.object({
            tools: z.object({}).optional(),
            resources: z.object({}).optional(),
            prompts: z.object({}).optional(),
        }),
        serverInfo: z.object({
            name: z.string(),
            version: z.string(),
        }),
    }),
});

export const McpToolsListRequest = z.object({
    jsonrpc: JsonRpcVersion,
    id: JsonRpcId,
    method: z.literal('tools/list'),
});

export const McpToolsListResponse = z.object({
    jsonrpc: JsonRpcVersion,
    id: JsonRpcId,
    result: z.object({
        tools: z.array(z.object({
            name: z.string(),
            description: z.string(),
            inputSchema: z.record(z.any()),
        })),
    }),
});

export const McpToolsCallRequest = z.object({
    jsonrpc: JsonRpcVersion,
    id: JsonRpcId,
    method: z.literal('tools/call'),
    params: z.object({
        name: z.string(),
        arguments: z.record(z.any()).optional(),
    }),
});

export const McpResourcesListRequest = z.object({
    jsonrpc: JsonRpcVersion,
    id: JsonRpcId,
    method: z.literal('resources/list'),
});

export const McpResourcesListResponse = z.object({
    jsonrpc: JsonRpcVersion,
    id: JsonRpcId,
    result: z.object({
        resources: z.array(z.object({
            uri: z.string(),
            name: z.string(),
            description: z.string().optional(),
            mimeType: z.string().optional(),
        })),
    }),
});

export const McpResourcesReadRequest = z.object({
    jsonrpc: JsonRpcVersion,
    id: JsonRpcId,
    method: z.literal('resources/read'),
    params: z.object({
        uri: z.string(),
    }),
});

export const McpResourcesReadResponse = z.object({
    jsonrpc: JsonRpcVersion,
    id: JsonRpcId,
    result: z.object({
        contents: z.array(z.object({
            uri: z.string(),
            mimeType: z.string().optional(),
            text: z.string(),
        })),
    }),
});

export const McpPromptsListRequest = z.object({
    jsonrpc: JsonRpcVersion,
    id: JsonRpcId,
    method: z.literal('prompts/list'),
});

export const McpPromptsListResponse = z.object({
    jsonrpc: JsonRpcVersion,
    id: JsonRpcId,
    result: z.object({
        prompts: z.array(z.any()), // Empty for now
    }),
});

// Type exports for MCP schemas
export type McpInitializeRequest = z.infer<typeof McpInitializeRequest>;
export type McpInitializeResponse = z.infer<typeof McpInitializeResponse>;
export type McpToolsListRequest = z.infer<typeof McpToolsListRequest>;
export type McpToolsListResponse = z.infer<typeof McpToolsListResponse>;
export type McpToolsCallRequest = z.infer<typeof McpToolsCallRequest>;
export type McpResourcesListRequest = z.infer<typeof McpResourcesListRequest>;
export type McpResourcesListResponse = z.infer<typeof McpResourcesListResponse>;
export type McpResourcesReadRequest = z.infer<typeof McpResourcesReadRequest>;
export type McpResourcesReadResponse = z.infer<typeof McpResourcesReadResponse>;
export type McpPromptsListRequest = z.infer<typeof McpPromptsListRequest>;
export type McpPromptsListResponse = z.infer<typeof McpPromptsListResponse>;