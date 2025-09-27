import { z } from 'zod';
import { JsonRpcRequest, JsonRpcResponse, JsonRpcErrorResponse, JsonRpcNotification } from './jsonrpc.js';
import { mapErrorToJsonRpc } from './errors.js';

/**
 * Request handler function type
 */
export type RequestHandler = (request: JsonRpcRequest, context?: RequestContext) => Promise<JsonRpcResponse>;

/**
 * Notification handler function type
 */
export type NotificationHandler = (notification: JsonRpcNotification, context?: RequestContext) => Promise<void>;

/**
 * Request context for handlers
 */
export interface RequestContext {
    requestId: string | number;
    method: string;
    startTime: number;
    params?: any;
}

/**
 * Handler registry for JSON-RPC methods
 */
export class RpcHandlerRegistry {
    private requestHandlers: Map<string, RequestHandler> = new Map();
    private notificationHandlers: Map<string, NotificationHandler> = new Map();
    private hooks: {
        beforeRequest?: (request: JsonRpcRequest, context: RequestContext) => Promise<void>;
        afterRequest?: (request: JsonRpcRequest, response: JsonRpcResponse | JsonRpcErrorResponse, context: RequestContext) => Promise<void>;
        beforeNotification?: (notification: JsonRpcNotification, context: RequestContext) => Promise<void>;
        afterNotification?: (notification: JsonRpcNotification, context: RequestContext) => Promise<void>;
        onError?: (error: unknown, request: JsonRpcRequest | JsonRpcNotification, context: RequestContext) => Promise<JsonRpcErrorResponse | void>;
    } = {};

    /**
     * Register a request handler for a method
     */
    registerRequestHandler(method: string, handler: RequestHandler): void {
        this.requestHandlers.set(method, handler);
    }

    /**
     * Register a notification handler for a method
     */
    registerNotificationHandler(method: string, handler: NotificationHandler): void {
        this.notificationHandlers.set(method, handler);
    }

    /**
     * Set hooks for request/notification lifecycle
     */
    setHooks(hooks: {
        beforeRequest?: (request: JsonRpcRequest, context: RequestContext) => Promise<void>;
        afterRequest?: (request: JsonRpcRequest, response: JsonRpcResponse | JsonRpcErrorResponse, context: RequestContext) => Promise<void>;
        beforeNotification?: (notification: JsonRpcNotification, context: RequestContext) => Promise<void>;
        afterNotification?: (notification: JsonRpcNotification, context: RequestContext) => Promise<void>;
        onError?: (error: unknown, request: JsonRpcRequest | JsonRpcNotification, context: RequestContext) => Promise<JsonRpcErrorResponse | void>;
    }): void {
        this.hooks = hooks;
    }

    /**
     * Handle a JSON-RPC request
     */
    async handleRequest(request: JsonRpcRequest): Promise<JsonRpcResponse | JsonRpcErrorResponse> {
        const context: RequestContext = {
            requestId: request.id,
            method: request.method,
            startTime: Date.now(),
            params: request.params,
        };

        try {
            // Call beforeRequest hook
            if (this.hooks.beforeRequest) {
                await this.hooks.beforeRequest(request, context);
            }

            // Get handler
            const handler = this.requestHandlers.get(request.method);
            if (!handler) {
                const errorResponse: JsonRpcErrorResponse = {
                    jsonrpc: '2.0',
                    id: request.id,
                    error: {
                        code: -32601,
                        message: 'Method not found',
                    },
                };
                return errorResponse;
            }

            // Call handler
            const response = await handler(request, context);

            // Call afterRequest hook
            if (this.hooks.afterRequest) {
                await this.hooks.afterRequest(request, response, context);
            }

            return response;
        } catch (error) {
            // Call onError hook
            if (this.hooks.onError) {
                const hookResult = await this.hooks.onError(error, request, context);
                if (hookResult) {
                    return hookResult;
                }
            }

            // Default error handling
            const jsonRpcError = mapErrorToJsonRpc(error);
            return {
                jsonrpc: '2.0',
                id: request.id,
                error: jsonRpcError,
            };
        }
    }

    /**
     * Handle a JSON-RPC notification
     */
    async handleNotification(notification: JsonRpcNotification): Promise<void> {
        const context: RequestContext = {
            requestId: 'notification', // Notifications don't have IDs
            method: notification.method,
            startTime: Date.now(),
            params: notification.params,
        };

        try {
            // Call beforeNotification hook
            if (this.hooks.beforeNotification) {
                await this.hooks.beforeNotification(notification, context);
            }

            // Get handler
            const handler = this.notificationHandlers.get(notification.method);
            if (handler) {
                await handler(notification, context);
            }

            // Call afterNotification hook
            if (this.hooks.afterNotification) {
                await this.hooks.afterNotification(notification, context);
            }
        } catch (error) {
            // Call onError hook
            if (this.hooks.onError) {
                await this.hooks.onError(error, notification, context);
            }
            // For notifications, we don't return errors, just log them
            console.error('Notification handler error:', error);
        }
    }

    /**
     * Get all registered request methods
     */
    getRegisteredMethods(): string[] {
        return Array.from(this.requestHandlers.keys());
    }

    /**
     * Get all registered notification methods
     */
    getRegisteredNotificationMethods(): string[] {
        return Array.from(this.notificationHandlers.keys());
    }

    /**
     * Check if a method is registered
     */
    hasMethod(method: string): boolean {
        return this.requestHandlers.has(method) || this.notificationHandlers.has(method);
    }
}

/**
 * Create a new handler registry
 */
export function createRpcHandlerRegistry(): RpcHandlerRegistry {
    return new RpcHandlerRegistry();
}

/**
 * Simple dispatcher function for basic use cases
 */
export async function dispatchRpcMessage(
    message: JsonRpcRequest | JsonRpcNotification,
    registry: RpcHandlerRegistry
): Promise<JsonRpcResponse | JsonRpcErrorResponse | void> {
    if ('id' in message) {
        // It's a request
        return await registry.handleRequest(message);
    } else {
        // It's a notification
        return await registry.handleNotification(message);
    }
}