/**
 * Generic paging utilities for MCP servers
 * Supports OData @odata.nextLink and cursor-based pagination
 */

export interface PageResult<T> {
    items: T[];
    nextPageToken?: string;
    hasMore: boolean;
    totalCount?: number;
}

export interface PaginationOptions {
    pageSize?: number;
    maxPages?: number;
    startPageToken?: string;
}

export interface ODataResponse<T> {
    value: T[];
    '@odata.nextLink'?: string;
    '@odata.count'?: number;
}

export interface CursorPageResponse<T> {
    data: T[];
    next_cursor?: string;
    has_more?: boolean;
    total_count?: number;
}

/**
 * Generic page iterator for handling different pagination styles
 */
export class PageIterator<T> {
    private currentPage = 0;
    private hasMore = true;
    private nextPageToken?: string;

    constructor(
        private fetchPage: (pageToken?: string) => Promise<PageResult<T>>,
        private options: PaginationOptions = {}
    ) {
        this.nextPageToken = options.startPageToken;
    }

    /**
     * Get the next page of results
     */
    async next(): Promise<PageResult<T> | null> {
        if (!this.hasMore) {
            return null;
        }

        if (this.options.maxPages && this.currentPage >= this.options.maxPages) {
            this.hasMore = false;
            return null;
        }

        const result = await this.fetchPage(this.nextPageToken);
        this.currentPage++;
        this.hasMore = result.hasMore;
        this.nextPageToken = result.nextPageToken;

        return result;
    }

    /**
     * Iterate through all pages
     */
    async *all(): AsyncGenerator<T[], void, unknown> {
        let page;
        while ((page = await this.next()) !== null) {
            yield page.items;
        }
    }

    /**
     * Collect all items into a single array
     */
    async collect(): Promise<T[]> {
        const allItems: T[] = [];
        for await (const page of this.all()) {
            allItems.push(...page);
        }
        return allItems;
    }

    /**
     * Get current page number (0-based)
     */
    getCurrentPage(): number {
        return this.currentPage;
    }

    /**
     * Check if there are more pages
     */
    hasNextPage(): boolean {
        return this.hasMore;
    }
}

/**
 * OData-style pagination helper
 */
export class ODataPageIterator<T> extends PageIterator<T> {
    constructor(
        private odataFetcher: (skipToken?: string) => Promise<ODataResponse<T>>,
        options: PaginationOptions = {}
    ) {
        super(async (pageToken) => {
            const response = await odataFetcher(pageToken);
            return {
                items: response.value,
                nextPageToken: this.extractSkipToken(response['@odata.nextLink']),
                hasMore: Boolean(response['@odata.nextLink']),
                totalCount: response['@odata.count']
            };
        }, options);
    }

    private extractSkipToken(nextLink?: string): string | undefined {
        if (!nextLink) return undefined;

        try {
            const url = new URL(nextLink);
            return url.searchParams.get('$skiptoken') || undefined;
        } catch {
            return undefined;
        }
    }
}

/**
 * Cursor-based pagination helper
 */
export class CursorPageIterator<T> extends PageIterator<T> {
    constructor(
        private cursorFetcher: (cursor?: string) => Promise<CursorPageResponse<T>>,
        options: PaginationOptions = {}
    ) {
        super(async (pageToken) => {
            const response = await cursorFetcher(pageToken);
            return {
                items: response.data,
                nextPageToken: response.next_cursor,
                hasMore: response.has_more ?? Boolean(response.next_cursor),
                totalCount: response.total_count
            };
        }, options);
    }
}

/**
 * Offset-based pagination helper
 */
export class OffsetPageIterator<T> extends PageIterator<T> {
    private currentOffset = 0;

    constructor(
        private offsetFetcher: (offset: number, limit: number) => Promise<{ items: T[]; totalCount?: number; hasMore: boolean }>,
        options: PaginationOptions = {}
    ) {
        super(async () => {
            const limit = options.pageSize || 50;
            const response = await offsetFetcher(this.currentOffset, limit);

            const result: PageResult<T> = {
                items: response.items,
                hasMore: response.hasMore && (response.totalCount ? this.currentOffset + limit < response.totalCount : true),
                totalCount: response.totalCount
            };

            if (result.hasMore) {
                result.nextPageToken = (this.currentOffset + limit).toString();
            }

            this.currentOffset += limit;
            return result;
        }, options);
    }
}

/**
 * Create a page iterator from a fetch function
 */
export function createPageIterator<T>(
    fetchPage: (pageToken?: string) => Promise<PageResult<T>>,
    options: PaginationOptions = {}
): PageIterator<T> {
    return new PageIterator(fetchPage, options);
}

/**
 * Create an OData page iterator
 */
export function createODataPageIterator<T>(
    fetchOData: (skipToken?: string) => Promise<ODataResponse<T>>,
    options: PaginationOptions = {}
): ODataPageIterator<T> {
    return new ODataPageIterator(fetchOData, options);
}

/**
 * Create a cursor-based page iterator
 */
export function createCursorPageIterator<T>(
    fetchCursor: (cursor?: string) => Promise<CursorPageResponse<T>>,
    options: PaginationOptions = {}
): CursorPageIterator<T> {
    return new CursorPageIterator(fetchCursor, options);
}

/**
 * Create an offset-based page iterator
 */
export function createOffsetPageIterator<T>(
    fetchOffset: (offset: number, limit: number) => Promise<{ items: T[]; totalCount?: number; hasMore: boolean }>,
    options: PaginationOptions = {}
): OffsetPageIterator<T> {
    return new OffsetPageIterator(fetchOffset, options);
}

/**
 * Utility to convert various response formats to PageResult
 */
export function normalizePageResult<T>(
    response: any,
    itemKey: string = 'items',
    nextTokenKey: string = 'nextPageToken',
    hasMoreKey: string = 'hasMore',
    totalCountKey: string = 'totalCount'
): PageResult<T> {
    return {
        items: response[itemKey] || response.value || response.data || [],
        nextPageToken: response[nextTokenKey] || response['@odata.nextLink'] || response.next_cursor,
        hasMore: response[hasMoreKey] || response.has_more || Boolean(response['@odata.nextLink'] || response.next_cursor),
        totalCount: response[totalCountKey] || response['@odata.count'] || response.total_count
    };
}