/**
 * Storage factory for MCP Framework - Unified storage backend creation
 * Provides environment-based backend resolution for all MCP servers
 */

import { ExtendedStorageInterface } from './interface.js';
import { MemoryStorage } from './backends/memory.js';

export interface StorageConfig {
    backend?: 'memory' | 'postgres';
    uri?: string;
    path?: string;
    // PostgreSQL options would be added in Phase 2
}

/**
 * Resolve storage configuration from environment variables
 * @param envPrefix Environment variable prefix (e.g., 'MCP_MEMORY' for MCP_MEMORY_DB_URI)
 * @returns Storage configuration
 */
function resolveStorageConfig(envPrefix?: string): StorageConfig {
    const prefix = envPrefix || 'MCP_STORAGE';

    // Check for URI-based configuration
    const uriKey = `${prefix}_DB_URI`;
    const uri = process.env[uriKey];

    if (uri) {
        // Simple backend detection for Phase 1
        if (uri.startsWith('memory:')) {
            return { backend: 'memory', uri };
        }
        // Default to memory for Phase 1
        return { backend: 'memory', uri };
    }

    // Check for direct path configuration
    const pathKey = `${prefix}_DB_PATH`;
    const path = process.env[pathKey];

    if (path) {
        return { backend: 'memory', path };
    }

    // Default configuration
    return { backend: 'memory' };
}

/**
 * Create storage backend instance
 * @param config Storage configuration
 * @returns Configured storage backend
 */
export async function createStorage(config?: StorageConfig): Promise<ExtendedStorageInterface> {
    const finalConfig = config || resolveStorageConfig();

    switch (finalConfig.backend) {
        case 'memory':
        default:
            return new MemoryStorage();
    }
}

/**
 * Create storage backend with environment prefix
 * @param envPrefix Environment variable prefix
 * @returns Configured storage backend
 */
export async function createStorageFromEnv(envPrefix?: string): Promise<ExtendedStorageInterface> {
    const config = resolveStorageConfig(envPrefix);
    return createStorage(config);
}