/**
 * JSON-RPC 2.0 error codes and mapping utilities for MCP servers.
 * Provides standardized error handling and client communication.
 */

export const JSONRPC_ERROR_CODES = {
    // Standard JSON-RPC 2.0 error codes
    PARSE_ERROR: -32700,
    INVALID_REQUEST: -32600,
    METHOD_NOT_FOUND: -32601,
    INVALID_PARAMS: -32602,
    INTERNAL_ERROR: -32603,

    // MCP-specific error codes (generic)
    CONCURRENCY_REJECTED: -32001,
    PAYLOAD_TOO_LARGE: -32002,
    SERVICE_UNAVAILABLE: -32003,
    CONFIGURATION_ERROR: -32004,
    SECURITY_VIOLATION: -32005,
} as const;

export type JsonRpcErrorCode = typeof JSONRPC_ERROR_CODES[keyof typeof JSONRPC_ERROR_CODES];

export interface JsonRpcError {
    code: JsonRpcErrorCode;
    message: string;
    data?: any;
}

/**
 * Map application errors to standardized JSON-RPC error responses.
 * Provides consistent error communication with MCP clients.
 */
export function mapErrorToJsonRpc(error: unknown): JsonRpcError {
    // Handle Error instances
    if (error instanceof Error) {
        const message = error.message.toLowerCase();

        // Concurrency and rate limiting errors
        if (message.includes('semaphore') || message.includes('concurrency') || message.includes('rate limit')) {
            return {
                code: JSONRPC_ERROR_CODES.CONCURRENCY_REJECTED,
                message: 'Request rejected due to concurrency limits',
                data: { reason: 'concurrency_limit_exceeded' }
            };
        }

        // Payload size errors
        if (message.includes('payload') || message.includes('size') || message.includes('large')) {
            return {
                code: JSONRPC_ERROR_CODES.PAYLOAD_TOO_LARGE,
                message: 'Request payload exceeds size limits',
                data: { reason: 'payload_too_large' }
            };
        }

        // Service unavailable errors
        if (message.includes('service') || message.includes('unavailable') || message.includes('timeout')) {
            return {
                code: JSONRPC_ERROR_CODES.SERVICE_UNAVAILABLE,
                message: 'Service temporarily unavailable',
                data: { reason: 'service_unavailable' }
            };
        }

        // Configuration errors
        if (message.includes('config') || message.includes('environment')) {
            return {
                code: JSONRPC_ERROR_CODES.CONFIGURATION_ERROR,
                message: 'Server configuration error',
                data: { reason: 'configuration_error' }
            };
        }

        // Security violations
        if (message.includes('security') || message.includes('unauthorized') || message.includes('forbidden')) {
            return {
                code: JSONRPC_ERROR_CODES.SECURITY_VIOLATION,
                message: 'Security policy violation',
                data: { reason: 'security_violation' }
            };
        }
    }

    // Handle Zod validation errors
    if (typeof error === 'object' && error !== null && 'errors' in error) {
        return {
            code: JSONRPC_ERROR_CODES.INVALID_PARAMS,
            message: 'Invalid parameters',
            data: {
                reason: 'validation_error',
                details: (error as any).errors
            }
        };
    }

    // Default to internal error for unknown error types
    return {
        code: JSONRPC_ERROR_CODES.INTERNAL_ERROR,
        message: 'Internal server error',
        data: {
            reason: 'unknown_error',
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        }
    };
}

/**
 * Create a standardized JSON-RPC error response.
 */
export function createJsonRpcError(id: any, error: JsonRpcError): any {
    return {
        jsonrpc: '2.0',
        id,
        error
    };
}

/**
 * Check if an error is a JSON-RPC error.
 */
export function isJsonRpcError(error: any): error is JsonRpcError {
    return (
        typeof error === 'object' &&
        error !== null &&
        typeof error.code === 'number' &&
        typeof error.message === 'string' &&
        error.code >= -32768 &&
        error.code <= -32000
    );
}