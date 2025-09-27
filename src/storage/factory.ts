/**
 * Storage factory for MCP Kit - Unified storage backend creation
 * Provides environment-based backend resolution for all MCP servers
 */

import { ExtendedStorageInterface } from './interface.js';
import { SqliteStorage } from './backends/sqlite.js';

export interface StorageConfig {
    backend?: 'sqlite' | 'postgres' | 'memory';
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
        if (uri.startsWith('sqlite:') || uri.startsWith('file:')) {
            return { backend: 'sqlite', uri };
        }
        // Default to SQLite for Phase 1
        return { backend: 'sqlite', uri };
    }

    // Check for direct path configuration
    const pathKey = `${prefix}_DB_PATH`;
    const path = process.env[pathKey];

    if (path) {
        return { backend: 'sqlite', path };
    }

    // Default configuration
    return { backend: 'sqlite', path: './data/storage.db' };
}

/**
 * Create storage backend instance
 * @param config Storage configuration
 * @returns Configured storage backend
 */
export async function createStorage(config?: StorageConfig): Promise<ExtendedStorageInterface> {
    const finalConfig = config || resolveStorageConfig();

    switch (finalConfig.backend) {
        case 'sqlite':
        default:
            const path = finalConfig.path || finalConfig.uri || './data/storage.db';
            return new SqliteStorage(path);
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