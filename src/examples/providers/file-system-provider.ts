import { ResourceProvider, ResourceProviderConfig } from '../../framework/providers/abstract/resource-provider.js';
import { Logger } from '../../logging.js';
import { readdirSync, statSync, readFileSync, existsSync } from 'fs';
import { join, resolve, extname } from 'path';

/**
 * File system resource provider that exposes files and directories as MCP resources
 */
export class FileSystemProvider extends ResourceProvider {
    private logger: Logger;
    private basePath: string;

    constructor(logger: Logger, basePath: string = process.cwd()) {
        super({ name: 'file-system', description: 'File system resource provider' });
        this.logger = logger;
        this.basePath = resolve(basePath);
    }

    getStaticResources(): any[] {
        const resources: any[] = [];

        try {
            const items = this.scanDirectory(this.basePath);

            for (const item of items) {
                const relativePath = item.path.replace(this.basePath, '').replace(/^\//, '');
                const resourceUri = `file://${item.path}`;

                resources.push({
                    uri: resourceUri,
                    name: relativePath || 'root',
                    description: item.isDirectory
                        ? `Directory: ${relativePath || 'root'}`
                        : `File: ${relativePath} (${this.getFileSize(item.path)} bytes)`,
                    mimeType: item.isDirectory ? 'inode/directory' : this.getMimeType(item.path)
                });
            }
        } catch (error) {
            this.logger.error('Failed to scan file system', error as any);
        }

        return resources;
    }

    async readResource(uri: string): Promise<any> {
        // Extract file path from URI
        const filePath = uri.replace('file://', '');

        if (!existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }

        const stat = statSync(filePath);

        if (stat.isDirectory()) {
            // Return directory listing
            const items = readdirSync(filePath).map(name => {
                const itemPath = join(filePath, name);
                const itemStat = statSync(itemPath);
                return {
                    name,
                    type: itemStat.isDirectory() ? 'directory' : 'file',
                    size: itemStat.size,
                    modified: itemStat.mtime.toISOString()
                };
            });

            return {
                contents: [{
                    uri,
                    mimeType: 'inode/directory',
                    text: JSON.stringify({
                        path: filePath,
                        items
                    }, null, 2)
                }]
            };
        } else {
            // Return file contents
            const content = readFileSync(filePath, 'utf-8');
            return {
                contents: [{
                    uri,
                    mimeType: this.getMimeType(filePath),
                    text: content
                }]
            };
        }
    }

    private scanDirectory(dirPath: string, maxDepth: number = 3, currentDepth: number = 0): Array<{ path: string, isDirectory: boolean }> {
        const items: Array<{ path: string, isDirectory: boolean }> = [];

        if (currentDepth > maxDepth) {
            return items;
        }

        try {
            const entries = readdirSync(dirPath);

            for (const entry of entries) {
                // Skip hidden files and common ignore patterns
                if (entry.startsWith('.') ||
                    entry === 'node_modules' ||
                    entry === 'dist' ||
                    entry === 'build' ||
                    entry === '.git') {
                    continue;
                }

                const fullPath = join(dirPath, entry);
                const stat = statSync(fullPath);

                items.push({
                    path: fullPath,
                    isDirectory: stat.isDirectory()
                });

                // Recursively scan directories
                if (stat.isDirectory()) {
                    items.push(...this.scanDirectory(fullPath, maxDepth, currentDepth + 1));
                }
            }
        } catch (error) {
            this.logger.warn(`Failed to scan directory ${dirPath}`, error as any);
        }

        return items;
    }

    private getFileSize(filePath: string): number {
        try {
            return statSync(filePath).size;
        } catch {
            return 0;
        }
    }

    private getMimeType(filePath: string): string {
        const ext = extname(filePath).toLowerCase();

        const mimeTypes: Record<string, string> = {
            '.txt': 'text/plain',
            '.json': 'application/json',
            '.js': 'application/javascript',
            '.ts': 'application/typescript',
            '.md': 'text/markdown',
            '.html': 'text/html',
            '.css': 'text/css',
            '.xml': 'application/xml',
            '.yaml': 'application/yaml',
            '.yml': 'application/yaml'
        };

        return mimeTypes[ext] || 'application/octet-stream';
    }
}