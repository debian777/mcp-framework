import { JsonRpcMessage } from '../../jsonrpc.js';

/**
 * Interface for MCP client transports
 */
export interface ClientTransport {
    /**
     * Connect to the MCP server
     */
    connect(): Promise<void>;

    /**
     * Disconnect from the MCP server
     */
    disconnect(): Promise<void>;

    /**
     * Send a JSON-RPC message to the server
     */
    send(message: JsonRpcMessage): Promise<void>;

    /**
     * Receive a JSON-RPC message from the server
     */
    receive(): Promise<JsonRpcMessage>;

    /**
     * Check if the transport is connected
     */
    isConnected(): boolean;
}