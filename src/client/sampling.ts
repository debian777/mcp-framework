/**
 * Sampling options for content generation requests
 */
export interface SamplingOptions {
    /** The messages to sample from */
    messages: Array<{
        role: 'user' | 'assistant' | 'system';
        content: {
            type: 'text' | 'image';
            text?: string;
            data?: string;
            mimeType?: string;
        };
    }>;
    /** Maximum number of tokens to sample */
    maxTokens?: number;
    /** Stop sequences */
    stopSequences?: string[];
    /** Temperature for sampling */
    temperature?: number;
    /** Top-p for sampling */
    topP?: number;
    /** Top-k for sampling */
    topK?: number;
    /** Additional metadata */
    metadata?: Record<string, any>;
}

/**
 * Result of a sampling operation
 */
export interface SamplingResult {
    /** The generated role */
    role: 'assistant';
    /** The generated content */
    content: {
        type: 'text' | 'image';
        text?: string;
        data?: string;
        mimeType?: string;
    };
    /** Model information */
    model?: string;
    /** Stop reason */
    stopReason?: 'endTurn' | 'stopSequence' | 'maxTokens';
    /** Usage statistics */
    usage?: {
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
    };
}