import { ExtendedStorageInterface, MemoryItem, SaveInput, LoadFilter, LoadResult, UpdateInput, WorkflowExecution, WorkflowExecutionInput, WorkflowAnalyticsFilter, WorkflowAnalyticsResult, QueryAnalysis } from '../interface.js';

/**
 * In-memory storage backend for MCP Framework
 * Provides a simple, non-persistent storage implementation
 */
export class MemoryStorage implements ExtendedStorageInterface {
    private memoryItems: Map<string, MemoryItem> = new Map();
    private workflowExecutions: WorkflowExecution[] = [];
    private nextId = 1;

    async initialize(): Promise<void> {
        // No initialization needed for memory storage
    }

    async save(input: SaveInput): Promise<MemoryItem> {
        const id = this.nextId.toString();
        this.nextId++;

        const now = new Date().toISOString();
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
            checksum: this.generateChecksum(input),
            priority: 0
        };

        this.memoryItems.set(id, item);
        return item;
    }

    async load(filter: LoadFilter): Promise<LoadResult> {
        let items = Array.from(this.memoryItems.values());

        // Apply scope filter
        if (filter.scope) {
            items = items.filter(item => item.scope === filter.scope);
        }

        // Apply project_uuid filter
        if (filter.project_uuid) {
            items = items.filter(item => item.project_uuid === filter.project_uuid);
        }

        // Apply other filters
        if (filter.filters) {
            const f = filter.filters;
            if (f.resource) {
                items = items.filter(item => item.resource === f.resource);
            }
            if (f.task) {
                items = items.filter(item => item.task === f.task);
            }
            if (f.type) {
                items = items.filter(item => item.type === f.type);
            }
            if (f.model) {
                items = items.filter(item => item.model === f.model);
            }
            if (f.tags && f.tags.length > 0) {
                items = items.filter(item =>
                    f.tags!.some(tag => item.tags.includes(tag))
                );
            }
        }

        // Sort by priority and creation date
        items.sort((a, b) => {
            if (a.priority !== b.priority) {
                return b.priority - a.priority;
            }
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

        // Apply limit
        const limit = filter.limit || 15;
        const limitedItems = items.slice(0, limit);

        return {
            items: limitedItems,
            count: limitedItems.length,
            next_page_token: items.length > limit ? 'more' : null
        };
    }

    async listProjectIds(): Promise<string[]> {
        const projectIds = new Set<string>();
        for (const item of this.memoryItems.values()) {
            if (item.project_uuid) {
                projectIds.add(item.project_uuid);
            }
        }
        return Array.from(projectIds);
    }

    async update(input: UpdateInput): Promise<MemoryItem> {
        const item = this.memoryItems.get(input.id);
        if (!item) {
            throw new Error(`Memory item with id ${input.id} not found`);
        }

        const updated: MemoryItem = {
            ...item,
            ...input,
            updated_at: new Date().toISOString(),
            checksum: this.generateChecksum(input)
        };

        this.memoryItems.set(input.id, updated);
        return updated;
    }

    async delete(id: string): Promise<boolean> {
        return this.memoryItems.delete(id);
    }

    async close(): Promise<void> {
        this.memoryItems.clear();
        this.workflowExecutions = [];
    }

    getStorageType(): string {
        return 'memory';
    }

    async analyzeQuery(filter: LoadFilter): Promise<QueryAnalysis> {
        // Simple analysis for memory storage
        return {
            query_plan: 'In-memory filter and sort',
            execution_time_ms: 0,
            estimated_rows: this.memoryItems.size,
            actual_rows: 0, // Would be set after actual query
            indexes_used: [],
            recommendations: ['Memory storage has no performance optimizations']
        };
    }

    async batchSave(items: SaveInput[]): Promise<MemoryItem[]> {
        const results: MemoryItem[] = [];
        for (const item of items) {
            results.push(await this.save(item));
        }
        return results;
    }

    async batchUpdate(updates: UpdateInput[]): Promise<MemoryItem[]> {
        const results: MemoryItem[] = [];
        for (const update of updates) {
            results.push(await this.update(update));
        }
        return results;
    }

    async batchDelete(ids: string[]): Promise<boolean[]> {
        const results: boolean[] = [];
        for (const id of ids) {
            results.push(await this.delete(id));
        }
        return results;
    }

    async logWorkflowExecution(input: WorkflowExecutionInput): Promise<WorkflowExecution> {
        const execution: WorkflowExecution = {
            id: this.nextId.toString(),
            workflow_id: input.workflow_id,
            model: input.model,
            timestamp: input.timestamp || new Date().toISOString(),
            duration_ms: input.duration_ms,
            lost_events: input.lost_events,
            execution_status: input.execution_status,
            error_message: input.error_message,
            tags: input.tags,
            metadata: input.metadata
        };

        this.workflowExecutions.push(execution);
        this.nextId++;
        return execution;
    }

    async getWorkflowAnalytics(filter: WorkflowAnalyticsFilter): Promise<WorkflowAnalyticsResult> {
        let executions = this.workflowExecutions;

        if (filter.model) {
            executions = executions.filter(e => e.model === filter.model);
        }
        if (filter.workflow_id) {
            executions = executions.filter(e => e.workflow_id === filter.workflow_id);
        }
        if (filter.start_date) {
            executions = executions.filter(e => e.timestamp >= filter.start_date!);
        }
        if (filter.end_date) {
            executions = executions.filter(e => e.timestamp <= filter.end_date!);
        }

        const total = executions.length;
        const perfect = executions.filter(e => e.lost_events === 0).length;
        const corrected = executions.filter(e => e.lost_events > 0).length;
        const failed = executions.filter(e => e.lost_events === -1).length;

        const avgLostEvents = total > 0 ? executions.reduce((sum, e) => sum + e.lost_events, 0) / total : 0;
        const avgDuration = total > 0 ? executions.filter(e => e.duration_ms).reduce((sum, e) => sum + (e.duration_ms || 0), 0) / executions.filter(e => e.duration_ms).length : 0;

        return {
            total_executions: total,
            perfect_executions: perfect,
            corrected_executions: corrected,
            failed_executions: failed,
            avg_lost_events: avgLostEvents,
            avg_duration: avgDuration,
            reliability_score: total > 0 ? (perfect / total) * 100 : 0
        };
    }

    async getWorkflowExecutions(filter: WorkflowAnalyticsFilter): Promise<WorkflowExecution[]> {
        let executions = this.workflowExecutions;

        if (filter.model) {
            executions = executions.filter(e => e.model === filter.model);
        }
        if (filter.workflow_id) {
            executions = executions.filter(e => e.workflow_id === filter.workflow_id);
        }
        if (filter.start_date) {
            executions = executions.filter(e => e.timestamp >= filter.start_date!);
        }
        if (filter.end_date) {
            executions = executions.filter(e => e.timestamp <= filter.end_date!);
        }

        const limit = filter.limit || 50;
        return executions.slice(0, limit);
    }

    private generateChecksum(input: any): string {
        // Simple checksum for memory storage
        return Date.now().toString();
    }
}