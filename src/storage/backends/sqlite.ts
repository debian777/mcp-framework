import sqlite3 from 'sqlite3';
import path from 'path';
import os from 'os';
import fs from 'fs';
import crypto from 'crypto';
import { ExtendedStorageInterface, MemoryItem, SaveInput, UpdateInput, LoadFilter, LoadResult, WorkflowExecution, WorkflowExecutionInput, WorkflowAnalyticsFilter, WorkflowAnalyticsResult, QueryAnalysis } from '../interface.js';

// Helper function to encode/decode continuation tokens
function encodeContinuationToken(cursor: { lastId: string; filters: any; limit: number }): string {
    const data = JSON.stringify(cursor);
    return Buffer.from(data).toString('base64');
}

function decodeContinuationToken(token: string): { lastId: string; filters: any; limit: number } | null {
    try {
        const data = Buffer.from(token, 'base64').toString('utf-8');
        return JSON.parse(data);
    } catch {
        return null;
    }
}

export class SqliteStorage implements ExtendedStorageInterface {
    private db: sqlite3.Database;

    constructor(dbPath?: string) {
        const defaultPath = path.join(os.homedir(), '.mcp-storage', 'db', 'storage.db');
        const finalPath = dbPath || process.env.MCP_STORAGE_DB_PATH || defaultPath;

        // Ensure directory exists
        const dir = path.dirname(finalPath);
        fs.mkdirSync(dir, { recursive: true });

        this.db = new sqlite3.Database(finalPath);
    }

    async initialize() {
        await this.initTables();
    }

    private async initTables() {
        return new Promise<void>((resolve, reject) => {
            this.db.run(`
                CREATE TABLE IF NOT EXISTS memory_items (
                    id TEXT PRIMARY KEY,
                    resource TEXT NOT NULL,
                    task TEXT NOT NULL,
                    type TEXT NOT NULL,
                    description TEXT NOT NULL,
                    scope TEXT NOT NULL DEFAULT 'global',
                    project_uuid TEXT,
                    model TEXT,
                    tags TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    checksum TEXT NOT NULL,
                    priority INTEGER NOT NULL DEFAULT 10,
                    last_deduped_at TEXT,
                    last_tagged_at TEXT,
                    last_normalized_at TEXT
                )
            `, (err) => {
                if (err) return reject(err);

                // Create workflow_executions table
                this.db.run(`
                    CREATE TABLE IF NOT EXISTS workflow_executions (
                        id TEXT PRIMARY KEY,
                        workflow_id TEXT NOT NULL,
                        model TEXT NOT NULL,
                        timestamp TEXT NOT NULL,
                        duration_ms INTEGER,
                        lost_events INTEGER NOT NULL DEFAULT 0,
                        execution_status TEXT NOT NULL,
                        error_message TEXT,
                        tags TEXT,
                        metadata TEXT
                    )
                `, (err) => {
                    if (err) return reject(err);

                    // Create indexes
                    this.db.run(`CREATE INDEX IF NOT EXISTS idx_memory_scope_type ON memory_items(scope, type)`, (err) => {
                        if (err) return reject(err);
                        this.db.run(`CREATE INDEX IF NOT EXISTS idx_memory_resource ON memory_items(resource)`, (err) => {
                            if (err) return reject(err);
                            this.db.run(`CREATE INDEX IF NOT EXISTS idx_memory_created_at ON memory_items(created_at)`, (err) => {
                                if (err) return reject(err);
                                this.db.run(`CREATE INDEX IF NOT EXISTS idx_memory_checksum ON memory_items(checksum)`, (err) => {
                                    if (err) return reject(err);
                                    // Phase 3: Database Performance Optimization - Composite indexes for frequently queried columns
                                    this.db.run(`CREATE INDEX IF NOT EXISTS idx_memory_scope_project_uuid ON memory_items(scope, project_uuid)`, (err) => {
                                        if (err) return reject(err);
                                        this.db.run(`CREATE INDEX IF NOT EXISTS idx_memory_resource_task ON memory_items(resource, task)`, (err) => {
                                            if (err) return reject(err);
                                            this.db.run(`CREATE INDEX IF NOT EXISTS idx_memory_scope_resource ON memory_items(scope, resource)`, (err) => {
                                                if (err) return reject(err);
                                                this.db.run(`CREATE INDEX IF NOT EXISTS idx_memory_scope_task ON memory_items(scope, task)`, (err) => {
                                                    if (err) reject(err);
                                                    else resolve();
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    }

    private generateChecksum(input: SaveInput): string {
        const data = `${input.description}${input.type}${input.resource}${input.task}`;
        return crypto.createHash('sha256').update(data).digest('hex');
    }

    async save(input: SaveInput): Promise<MemoryItem> {
        const checksum = this.generateChecksum(input);
        const now = new Date().toISOString();
        const id = crypto.randomUUID();

        // Check if item with same checksum exists
        const existing = await new Promise<{ id: string } | undefined>((resolve, reject) => {
            this.db.get('SELECT id FROM memory_items WHERE checksum = ?', [checksum], (err, row) => {
                if (err) reject(err);
                else resolve(row as { id: string } | undefined);
            });
        });

        if (existing) {
            // Update existing
            await new Promise<void>((resolve, reject) => {
                this.db.run('UPDATE memory_items SET updated_at = ?, tags = ?, model = ? WHERE id = ?', [now, JSON.stringify(input.tags || []), input.model, existing.id], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
            return await this.getById(existing.id);
        } else {
            // Insert new
            const item: MemoryItem = {
                id,
                resource: input.resource,
                task: input.task,
                type: input.type,
                description: input.description,
                scope: input.scope || 'global',
                project_uuid: input.project_uuid,
                model: input.model,
                tags: input.tags || [],
                created_at: now,
                updated_at: now,
                checksum,
                priority: 10
            };

            await new Promise<void>((resolve, reject) => {
                this.db.run(`
                    INSERT INTO memory_items (id, resource, task, type, description, scope, project_uuid, model, tags, created_at, updated_at, checksum, priority)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [item.id, item.resource, item.task, item.type, item.description, item.scope, item.project_uuid, item.model, JSON.stringify(item.tags), item.created_at, item.updated_at, item.checksum, item.priority], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            return item;
        }
    }

    async update(input: UpdateInput): Promise<MemoryItem> {
        const now = new Date().toISOString();
        const updates: string[] = [];
        const params: any[] = [];

        // Build dynamic update query
        if (input.resource !== undefined) {
            updates.push('resource = ?');
            params.push(input.resource);
        }
        if (input.task !== undefined) {
            updates.push('task = ?');
            params.push(input.task);
        }
        if (input.type !== undefined) {
            updates.push('type = ?');
            params.push(input.type);
        }
        if (input.description !== undefined) {
            updates.push('description = ?');
            params.push(input.description);
        }
        if (input.scope !== undefined) {
            updates.push('scope = ?');
            params.push(input.scope);
        }
        if (input.project_uuid !== undefined) {
            updates.push('project_uuid = ?');
            params.push(input.project_uuid);
        }
        if (input.model !== undefined) {
            updates.push('model = ?');
            params.push(input.model);
        }
        if (input.tags !== undefined) {
            updates.push('tags = ?');
            params.push(JSON.stringify(input.tags));
        }

        // Always update the updated_at timestamp
        updates.push('updated_at = ?');
        params.push(now);

        // Add the ID as the last parameter
        params.push(input.id);

        const query = `UPDATE memory_items SET ${updates.join(', ')} WHERE id = ?`;

        await new Promise<void>((resolve, reject) => {
            this.db.run(query, params, function (err) {
                if (err) reject(err);
                else if (this.changes === 0) reject(new Error(`Item with id ${input.id} not found`));
                else resolve();
            });
        });

        return await this.getById(input.id);
    }

    async load(filter: LoadFilter): Promise<LoadResult> {
        // Build the where clause
        let whereClause = ' WHERE 1=1';
        const params: any[] = [];

        if (filter.scope === 'global') {
            whereClause += ' AND scope = ?';
            params.push('global');
        } else if (filter.scope === 'project') {
            // Load both global and project-scoped memories
            whereClause += ' AND (scope = ? OR scope = ?)';
            params.push('global', 'project');
        }

        if (filter.project_uuid) {
            whereClause += ' AND project_uuid = ?';
            params.push(filter.project_uuid);
        }

        if (filter.filters?.resource) {
            whereClause += ' AND resource = ?';
            params.push(filter.filters.resource);
        }

        if (filter.filters?.task) {
            whereClause += ' AND task = ?';
            params.push(filter.filters.task);
        }

        if (filter.filters?.type) {
            whereClause += ' AND type = ?';
            params.push(filter.filters.type);
        }

        if (filter.filters?.model) {
            whereClause += ' AND model = ?';
            params.push(filter.filters.model);
        }

        if (filter.filters?.tags && filter.filters.tags.length > 0) {
            // Simple tag matching using LIKE
            const tagConditions = filter.filters.tags.map(() => 'tags LIKE ?').join(' OR ');
            const likePatterns = filter.filters.tags.map(tag => `%${tag}%`);
            whereClause += ` AND (${tagConditions})`;
            params.push(...likePatterns);
        }

        // Handle continuation token
        let cursorCondition = '';
        let cursorParams: any[] = [];

        if (filter.next_page_token) {
            const cursor = decodeContinuationToken(filter.next_page_token);
            if (cursor) {
                cursorCondition = ' AND id > ?';
                cursorParams = [cursor.lastId];
            }
        }

        // Determine if we should load all items or paginate
        const shouldLoadAll = !filter.limit && !filter.next_page_token;
        const limit = shouldLoadAll ? 10000 : (filter.limit || 100);

        const dataQuery = 'SELECT * FROM memory_items' + whereClause + cursorCondition + ' ORDER BY id ASC';
        const queryParams = [...params, ...cursorParams];

        let items: MemoryItem[];
        let next_page_token: string | null = null;

        if (shouldLoadAll) {
            // Load all items without pagination
            const rows = await new Promise<any[]>((resolve, reject) => {
                this.db.all(dataQuery, queryParams, (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });

            items = rows.map(row => ({
                ...row,
                tags: JSON.parse(row.tags || '[]')
            }));
        } else {
            // Use continuation token pagination
            const rows = await new Promise<any[]>((resolve, reject) => {
                this.db.all(dataQuery + ' LIMIT ?', [...queryParams, limit + 1], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });

            items = rows.slice(0, limit).map(row => ({
                ...row,
                tags: JSON.parse(row.tags || '[]')
            }));

            // Check if there are more items
            const hasMore = rows.length > limit;

            if (hasMore && items.length > 0) {
                // Generate continuation token
                const lastItem = items[items.length - 1];
                const cursor = {
                    lastId: lastItem.id,
                    filters: filter.filters || {},
                    limit: limit
                };
                next_page_token = encodeContinuationToken(cursor);
            }
        }

        return {
            items,
            count: items.length,
            next_page_token
        };
    }

    async listProjectIds(): Promise<string[]> {
        return await new Promise<string[]>((resolve, reject) => {
            this.db.all('SELECT DISTINCT project_uuid FROM memory_items WHERE project_uuid IS NOT NULL', [], (err, rows: Array<{ project_uuid: string }>) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows.map((row) => row.project_uuid).filter(Boolean));
                }
            });
        });
    }

    private async getById(id: string): Promise<MemoryItem> {
        const row = await new Promise<any>((resolve, reject) => {
            this.db.get('SELECT * FROM memory_items WHERE id = ?', [id], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        return {
            ...row,
            tags: JSON.parse(row.tags || '[]')
        };
    }

    async delete(id: string): Promise<boolean> {
        const changes = await new Promise<number>((resolve, reject) => {
            this.db.run(
                'DELETE FROM memory_items WHERE id = ?',
                [id],
                function (err) {
                    if (err) reject(err);
                    else resolve(this.changes || 0);
                }
            );
        });
        return changes > 0;
    }

    getStorageType(): string {
        return 'sqlite';
    }

    async logWorkflowExecution(input: WorkflowExecutionInput): Promise<WorkflowExecution> {
        const id = crypto.randomUUID();
        const timestamp = input.timestamp || new Date().toISOString();

        return new Promise((resolve, reject) => {
            this.db.run(`
                INSERT INTO workflow_executions (
                    id, workflow_id, model, timestamp, duration_ms,
                    lost_events, execution_status, error_message, tags, metadata
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                id,
                input.workflow_id,
                input.model,
                timestamp,
                input.duration_ms,
                input.lost_events,
                input.execution_status,
                input.error_message,
                JSON.stringify(input.tags || []),
                input.metadata ? JSON.stringify(input.metadata) : null
            ], function (err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({
                        id,
                        workflow_id: input.workflow_id,
                        model: input.model,
                        timestamp,
                        duration_ms: input.duration_ms,
                        lost_events: input.lost_events,
                        execution_status: input.execution_status,
                        error_message: input.error_message,
                        tags: input.tags || [],
                        metadata: input.metadata
                    });
                }
            });
        });
    }

    async getWorkflowAnalytics(filter: WorkflowAnalyticsFilter): Promise<WorkflowAnalyticsResult> {
        return new Promise((resolve, reject) => {
            let query = `
                SELECT
                    COUNT(*) as total_executions,
                    COUNT(CASE WHEN lost_events = 0 THEN 1 END) as perfect_executions,
                    COUNT(CASE WHEN lost_events > 0 THEN 1 END) as corrected_executions,
                    COUNT(CASE WHEN lost_events = -1 THEN 1 END) as failed_executions,
                    AVG(CASE WHEN lost_events >= 0 THEN lost_events END) as avg_lost_events,
                    AVG(duration_ms) as avg_duration
                FROM workflow_executions
                WHERE 1=1
            `;
            const params: any[] = [];

            if (filter.model) {
                query += ' AND model = ?';
                params.push(filter.model);
            }

            if (filter.workflow_id) {
                query += ' AND workflow_id = ?';
                params.push(filter.workflow_id);
            }

            if (filter.start_date) {
                query += ' AND timestamp >= ?';
                params.push(filter.start_date);
            }

            if (filter.end_date) {
                query += ' AND timestamp <= ?';
                params.push(filter.end_date);
            }

            this.db.get(query, params, (err, row: any) => {
                if (err) {
                    reject(err);
                } else {
                    resolve({
                        total_executions: row.total_executions || 0,
                        perfect_executions: row.perfect_executions || 0,
                        corrected_executions: row.corrected_executions || 0,
                        failed_executions: row.failed_executions || 0,
                        avg_lost_events: row.avg_lost_events || 0,
                        avg_duration: row.avg_duration || 0,
                        reliability_score: row.total_executions > 0
                            ? (row.perfect_executions / row.total_executions) * 100
                            : 0
                    });
                }
            });
        });
    }

    async getWorkflowExecutions(filter: WorkflowAnalyticsFilter): Promise<WorkflowExecution[]> {
        return new Promise((resolve, reject) => {
            let query = 'SELECT * FROM workflow_executions WHERE 1=1';
            const params: any[] = [];

            if (filter.model) {
                query += ' AND model = ?';
                params.push(filter.model);
            }

            if (filter.workflow_id) {
                query += ' AND workflow_id = ?';
                params.push(filter.workflow_id);
            }

            if (filter.start_date) {
                query += ' AND timestamp >= ?';
                params.push(filter.start_date);
            }

            if (filter.end_date) {
                query += ' AND timestamp <= ?';
                params.push(filter.end_date);
            }

            query += ' ORDER BY timestamp DESC';

            if (filter.limit) {
                query += ' LIMIT ?';
                params.push(filter.limit);
            }

            this.db.all(query, params, (err, rows: any[]) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows.map(row => ({
                        id: row.id,
                        workflow_id: row.workflow_id,
                        model: row.model,
                        timestamp: row.timestamp,
                        duration_ms: row.duration_ms,
                        lost_events: row.lost_events,
                        execution_status: row.execution_status,
                        error_message: row.error_message,
                        tags: JSON.parse(row.tags || '[]'),
                        metadata: row.metadata ? JSON.parse(row.metadata) : undefined
                    })));
                }
            });
        });
    }

    async analyzeQuery(filter: LoadFilter): Promise<QueryAnalysis> {
        // Build the same where clause as load() method
        let whereClause = ' WHERE 1=1';
        const params: any[] = [];

        if (filter.scope === 'global') {
            whereClause += ' AND scope = ?';
            params.push('global');
        } else if (filter.scope === 'project') {
            // Load both global and project-scoped memories
            whereClause += ' AND (scope = ? OR scope = ?)';
            params.push('global', 'project');
        }

        if (filter.project_uuid) {
            whereClause += ' AND project_uuid = ?';
            params.push(filter.project_uuid);
        }

        if (filter.filters?.resource) {
            whereClause += ' AND resource = ?';
            params.push(filter.filters.resource);
        }

        if (filter.filters?.task) {
            whereClause += ' AND task = ?';
            params.push(filter.filters.task);
        }

        if (filter.filters?.type) {
            whereClause += ' AND type = ?';
            params.push(filter.filters.type);
        }

        if (filter.filters?.model) {
            whereClause += ' AND model = ?';
            params.push(filter.filters.model);
        }

        if (filter.filters?.tags && filter.filters.tags.length > 0) {
            // Simple tag matching using LIKE
            const tagConditions = filter.filters.tags.map(() => 'tags LIKE ?').join(' OR ');
            const likePatterns = filter.filters.tags.map(tag => `%${tag}%`);
            whereClause += ` AND (${tagConditions})`;
            params.push(...likePatterns);
        }

        const dataQuery = 'SELECT * FROM memory_items' + whereClause + ' ORDER BY id ASC LIMIT 100';

        // Get EXPLAIN QUERY PLAN output
        const explainQuery = `EXPLAIN QUERY PLAN ${dataQuery}`;
        const explainResult = await new Promise<any[]>((resolve, reject) => {
            this.db.all(explainQuery, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        // Execute the actual query to get timing and row count
        const startTime = Date.now();
        const result = await new Promise<any[]>((resolve, reject) => {
            this.db.all(dataQuery, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        const executionTime = Date.now() - startTime;

        // Parse EXPLAIN output
        const queryPlan = explainResult.map(row =>
            `${row.detail || ''} (id=${row.id}, parent=${row.parent}, notused=${row.notused})`
        ).join('\n');

        const recommendations: string[] = [];
        const indexesUsed: string[] = [];

        // Analyze the plan for recommendations
        const hasSequentialScan = explainResult.some(row =>
            row.detail && row.detail.includes('SCAN TABLE')
        );

        if (hasSequentialScan) {
            recommendations.push('Query is using table scan - consider adding appropriate indexes');
        }

        // Extract index usage from plan (SQLite doesn't explicitly list indexes in EXPLAIN QUERY PLAN)
        // We'll infer from the query structure
        if (whereClause.includes('scope =')) {
            indexesUsed.push('idx_memory_scope_type');
        }
        if (whereClause.includes('resource =')) {
            indexesUsed.push('idx_memory_resource');
        }
        if (whereClause.includes('project_uuid =')) {
            indexesUsed.push('idx_memory_scope_project_uuid');
        }

        return {
            query_plan: queryPlan,
            execution_time_ms: executionTime,
            estimated_rows: undefined, // SQLite doesn't provide row estimates in EXPLAIN QUERY PLAN
            actual_rows: result.length,
            indexes_used: [...new Set(indexesUsed)], // Remove duplicates
            recommendations
        };
    }

    async batchSave(items: SaveInput[]): Promise<MemoryItem[]> {
        if (items.length === 0) return [];

        const savedItems: MemoryItem[] = [];

        // Use database transaction for atomicity
        await new Promise<void>((resolve, reject) => {
            this.db.run('BEGIN TRANSACTION', (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        try {
            for (const item of items) {
                const saved = await this.save(item);
                savedItems.push(saved);
            }

            await new Promise<void>((resolve, reject) => {
                this.db.run('COMMIT', (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        } catch (error) {
            await new Promise<void>((resolve, reject) => {
                this.db.run('ROLLBACK', (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
            throw error;
        }

        return savedItems;
    }

    async batchUpdate(updates: UpdateInput[]): Promise<MemoryItem[]> {
        if (updates.length === 0) return [];

        const updatedItems: MemoryItem[] = [];

        // Use database transaction for atomicity
        await new Promise<void>((resolve, reject) => {
            this.db.run('BEGIN TRANSACTION', (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        try {
            for (const update of updates) {
                const updated = await this.update(update);
                updatedItems.push(updated);
            }

            await new Promise<void>((resolve, reject) => {
                this.db.run('COMMIT', (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        } catch (error) {
            await new Promise<void>((resolve, reject) => {
                this.db.run('ROLLBACK', (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
            throw error;
        }

        return updatedItems;
    }

    async batchDelete(ids: string[]): Promise<boolean[]> {
        if (ids.length === 0) return [];

        const results: boolean[] = [];

        // Use database transaction for atomicity
        await new Promise<void>((resolve, reject) => {
            this.db.run('BEGIN TRANSACTION', (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        try {
            for (const id of ids) {
                const success = await this.delete(id);
                results.push(success);
            }

            await new Promise<void>((resolve, reject) => {
                this.db.run('COMMIT', (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        } catch (error) {
            await new Promise<void>((resolve, reject) => {
                this.db.run('ROLLBACK', (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
            throw error;
        }

        return results;
    }

    close(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.close((err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }
}