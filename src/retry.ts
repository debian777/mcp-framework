/**
 * Retry utilities with exponential backoff and jitter for MCP servers
 */

export interface RetryOptions {
    maxAttempts: number;
    baseDelayMs: number;
    maxDelayMs: number;
    backoffMultiplier: number;
    jitter: boolean;
    retryableErrors?: (error: unknown) => boolean;
}

export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    jitter: true,
    retryableErrors: (error: unknown) => {
        // Default retryable errors: network errors, 5xx HTTP errors, timeouts
        if (error instanceof Error) {
            const message = error.message.toLowerCase();
            return message.includes('network') ||
                message.includes('timeout') ||
                message.includes('connection') ||
                message.includes('econnrefused') ||
                message.includes('enotfound') ||
                message.includes('500') ||
                message.includes('502') ||
                message.includes('503') ||
                message.includes('504');
        }
        return false;
    }
};

/**
 * Calculate delay with exponential backoff and optional jitter
 */
export function calculateDelay(attempt: number, options: RetryOptions): number {
    const exponentialDelay = options.baseDelayMs * Math.pow(options.backoffMultiplier, attempt - 1);
    const delay = Math.min(exponentialDelay, options.maxDelayMs);

    if (options.jitter) {
        // Add random jitter (±25% of delay)
        const jitterRange = delay * 0.25;
        return delay + (Math.random() * 2 - 1) * jitterRange;
    }

    return delay;
}

/**
 * Sleep for the specified number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    options: Partial<RetryOptions> = {}
): Promise<T> {
    const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
    let lastError: unknown;

    for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            // Check if error is retryable
            if (!opts.retryableErrors!(error)) {
                throw error;
            }

            // Don't retry on last attempt
            if (attempt === opts.maxAttempts) {
                break;
            }

            // Calculate delay and wait
            const delay = calculateDelay(attempt, opts);
            await sleep(delay);
        }
    }

    throw lastError;
}

/**
 * Retry class for more complex retry scenarios
 */
export class RetryManager {
    private options: RetryOptions;

    constructor(options: Partial<RetryOptions> = {}) {
        this.options = { ...DEFAULT_RETRY_OPTIONS, ...options };
    }

    /**
     * Execute a function with retry logic
     */
    async execute<T>(fn: () => Promise<T>): Promise<T> {
        return retryWithBackoff(fn, this.options);
    }

    /**
     * Update retry options
     */
    updateOptions(options: Partial<RetryOptions>): void {
        this.options = { ...this.options, ...options };
    }

    /**
     * Get current options
     */
    getOptions(): RetryOptions {
        return { ...this.options };
    }
}

/**
 * Create a retry manager instance
 */
export function createRetryManager(options: Partial<RetryOptions> = {}): RetryManager {
    return new RetryManager(options);
}

/**
 * Circuit breaker pattern implementation
 */
export class CircuitBreaker {
    private failures = 0;
    private lastFailureTime = 0;
    private state: 'closed' | 'open' | 'half-open' = 'closed';

    constructor(
        private failureThreshold: number = 5,
        private recoveryTimeoutMs: number = 60000,
        private monitoringPeriodMs: number = 60000
    ) { }

    async execute<T>(fn: () => Promise<T>): Promise<T> {
        if (this.state === 'open') {
            if (Date.now() - this.lastFailureTime > this.recoveryTimeoutMs) {
                this.state = 'half-open';
            } else {
                throw new Error('Circuit breaker is open');
            }
        }

        try {
            const result = await fn();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }

    private onSuccess(): void {
        this.failures = 0;
        this.state = 'closed';
    }

    private onFailure(): void {
        this.failures++;
        this.lastFailureTime = Date.now();

        if (this.failures >= this.failureThreshold) {
            this.state = 'open';
        }
    }

    getState(): string {
        return this.state;
    }

    getFailureCount(): number {
        return this.failures;
    }
}

/**
 * Create a circuit breaker instance
 */
export function createCircuitBreaker(
    failureThreshold: number = 5,
    recoveryTimeoutMs: number = 60000
): CircuitBreaker {
    return new CircuitBreaker(failureThreshold, recoveryTimeoutMs);
}