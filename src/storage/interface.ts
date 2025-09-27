/**
 * Storage interface for MCP Kit - Unified storage abstraction
 * Provides unified API for different storage backends across MCP servers
 */

export interface MemoryItem {
    id: string;
    resource: string;
    task: string;
    type: string;
    description: string;
    scope: string;
    project_uuid?: string;
    model?: string; // AI model this memory item is optimized for
    tags: string[];
    created_at: string;
    updated_at: string;
    checksum: string;
    priority: number;
    last_deduped_at?: string;
    last_tagged_at?: string;
    last_normalized_at?: string;
}

export interface SaveInput {
    resource: string;
    task: string;
    type: string;
    description: string;
    scope?: string;
    project_uuid?: string;
    model?: string; // AI model this memory item is optimized for
    tags?: string[];
}

export interface UpdateInput {
    id: string;
    resource?: string;
    task?: string;
    type?: string;
    description?: string;
    scope?: string;
    project_uuid?: string;
    model?: string; // AI model this memory item is optimized for
    tags?: string[];
    last_deduped_at?: string;
    last_tagged_at?: string;
    last_normalized_at?: string;
}

export interface LoadFilter {
    scope?: string;
    project_uuid?: string;
    filters?: {
        resource?: string;
        task?: string;
        type?: string;
        model?: string; // Filter by AI model
        tags?: string[];
    };
    limit?: number;
    next_page_token?: string;
}

export interface LoadResult {
    items: MemoryItem[];
    count: number;
    next_page_token: string | null;
}

/**
 * Unified storage interface for all backend implementations
 */
export interface StorageInterface {
    /**
     * Initialize the storage backend
     */
    initialize(): Promise<void>;

    /**
     * Save a memory item
     */
    save(input: SaveInput): Promise<MemoryItem>;

    /**
     * Load memory items with filtering and pagination
     */
    load(filter: LoadFilter): Promise<LoadResult>;

    /**
     * List distinct project identifiers present in storage
     */
    listProjectIds(): Promise<string[]>;

    /**
     * Update an existing memory item
     */
    update(input: UpdateInput): Promise<MemoryItem>;

    /**
     * Delete a memory item by id
     * Returns true when a row was deleted
     */
    delete(id: string): Promise<boolean>;

    /**
     * Close the storage backend connection
     */
    close(): Promise<void>;

    /**
     * Get the storage backend type
     */
    getStorageType(): string;

    /**
     * Analyze query performance and execution plan
     * Phase 3: Database Performance Optimization
     */
    analyzeQuery(filter: LoadFilter): Promise<QueryAnalysis>;

    /**
     * Batch save multiple memory items
     * Phase 3: Database Performance Optimization
     */
    batchSave(items: SaveInput[]): Promise<MemoryItem[]>;

    /**
     * Batch update multiple memory items
     * Phase 3: Database Performance Optimization
     */
    batchUpdate(updates: UpdateInput[]): Promise<MemoryItem[]>;

    /**
     * Batch delete multiple memory items by IDs
     * Phase 3: Database Performance Optimization
     */
    batchDelete(ids: string[]): Promise<boolean[]>;
}

/**
 * Workflow execution tracking interfaces
 */
export interface WorkflowExecution {
    id: string;
    workflow_id: string;
    model: string;
    timestamp: string;
    duration_ms?: number;
    lost_events: number; // -1 = failure, 0 = perfect, >0 = count of lost events
    execution_status: 'success' | 'partial' | 'failure';
    error_message?: string;
    tags?: string[];
    metadata?: Record<string, any>;
}

export interface WorkflowExecutionInput {
    workflow_id: string;
    model: string;
    timestamp?: string;
    duration_ms?: number;
    lost_events: number;
    execution_status: 'success' | 'partial' | 'failure';
    error_message?: string;
    tags?: string[];
    metadata?: Record<string, any>;
}

export interface WorkflowAnalyticsFilter {
    model?: string;
    workflow_id?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
}

export interface WorkflowAnalyticsResult {
    total_executions: number;
    perfect_executions: number; // lost_events = 0
    corrected_executions: number; // lost_events > 0
    failed_executions: number; // lost_events = -1
    avg_lost_events: number;
    avg_duration: number;
    reliability_score: number; // percentage of perfect executions
}

/**
 * Query analysis result for performance optimization
 * Phase 3: Database Performance Optimization
 */
export interface QueryAnalysis {
    query_plan: string; // EXPLAIN output or query plan
    execution_time_ms?: number; // Actual execution time if available
    estimated_rows?: number; // Estimated number of rows
    actual_rows?: number; // Actual number of rows returned
    indexes_used: string[]; // List of indexes used in the query
    recommendations: string[]; // Performance optimization suggestions
}

/**
 * Extended storage interface with workflow execution tracking
 */
export interface ExtendedStorageInterface extends StorageInterface {
    /**
     * Log a workflow execution
     */
    logWorkflowExecution(input: WorkflowExecutionInput): Promise<WorkflowExecution>;

    /**
     * Get workflow analytics
     */
    getWorkflowAnalytics(filter: WorkflowAnalyticsFilter): Promise<WorkflowAnalyticsResult>;

    /**
     * Get workflow executions with filtering
     */
    getWorkflowExecutions(filter: WorkflowAnalyticsFilter): Promise<WorkflowExecution[]>;
}