# MCP Framework Resources - Implementation Guide

## Overview

This guide provides step-by-step instructions for implementing the Resource System in `@debian777/mcp-framework` v0.4.0.

**Estimated Time**: 3-4 hours
**Difficulty**: Intermediate
**Prerequisites**: TypeScript, MCP protocol basics

## Phase 1: Base Infrastructure (1 hour)

### Step 1.1: Create Base Types & Interfaces

**File**: `src/resources/base.ts`

```typescript
import type { Resource } from "@modelcontextprotocol/sdk/types";

/**
 * Resource content returned by handlers
 */
export interface ResourceContent {
  uri: string;
  mimeType: string;
  text?: string;
  blob?: string;
}

/**
 * Result of reading a resource
 */
export interface ResourceReadResult {
  contents: ResourceContent[];
}

/**
 * Interface that all resource handlers must implement
 */
export interface ResourceHandler {
  /** Type identifier for this handler (e.g., "memory", "config") */
  readonly type: string;

  /** URI prefix this handler responds to (e.g., "resource://memory/") */
  readonly uriPrefix: string;

  /** Check if this handler can handle the given URI */
  canHandle(uri: string): boolean;

  /** List all resources this handler provides */
  list(): Promise<Resource[]>;

  /** Read a specific resource by URI */
  read(uri: string): Promise<ResourceReadResult>;
}

/**
 * Abstract base class for resource handlers
 * Provides common functionality and validation
 */
export abstract class BaseResourceHandler implements ResourceHandler {
  abstract readonly type: string;
  abstract readonly uriPrefix: string;

  /**
   * Check if this handler can handle the given URI
   * Default implementation checks URI prefix
   */
  canHandle(uri: string): boolean {
    return uri.startsWith(this.uriPrefix);
  }

  /**
   * List all resources this handler provides
   */
  abstract list(): Promise<Resource[]>;

  /**
   * Read a specific resource by URI
   */
  abstract read(uri: string): Promise<ResourceReadResult>;

  /**
   * Validate that URI matches this handler's prefix
   * @throws Error if URI is invalid
   */
  protected validateUri(uri: string): void {
    if (!this.canHandle(uri)) {
      throw new Error(
        `Invalid URI for ${this.type} handler. ` +
        `Expected prefix: ${this.uriPrefix}, got: ${uri}`
      );
    }
  }

  /**
   * Create a helpful "not found" error message
   */
  protected createNotFoundError(uri: string, availableUris: string[]): Error {
    return new Error(
      `Resource not found: ${uri}\n` +
      `Available ${this.type} resources:\n` +
      availableUris.map(u => `  - ${u}`).join('\n')
    );
  }
}
```

**Test**: `src/resources/__tests__/base.test.ts`

```typescript
import { BaseResourceHandler } from "../base.js";
import type { Resource } from "@modelcontextprotocol/sdk/types";

class TestHandler extends BaseResourceHandler {
  readonly type = "test";
  readonly uriPrefix = "resource://test/";

  async list(): Promise<Resource[]> {
    return [{
      uri: "resource://test/example",
      name: "Test Resource",
      description: "A test resource"
    }];
  }

  async read(uri: string): Promise<{ contents: any[] }> {
    this.validateUri(uri);
    return {
      contents: [{
        uri,
        mimeType: "text/plain",
        text: "test content"
      }]
    };
  }
}

describe("BaseResourceHandler", () => {
  let handler: TestHandler;

  beforeEach(() => {
    handler = new TestHandler();
  });

  it("should recognize URIs with correct prefix", () => {
    expect(handler.canHandle("resource://test/example")).toBe(true);
    expect(handler.canHandle("resource://other/example")).toBe(false);
  });

  it("should validate URI correctly", () => {
    expect(() => handler['validateUri']("resource://test/example")).not.toThrow();
    expect(() => handler['validateUri']("resource://other/example")).toThrow();
  });

  it("should create helpful error messages", () => {
    const error = handler['createNotFoundError'](
      "resource://test/missing",
      ["resource://test/example"]
    );
    expect(error.message).toContain("Resource not found");
    expect(error.message).toContain("resource://test/example");
  });
});
```

### Step 1.2: Create Resource Registry

**File**: `src/resources/registry.ts`

```typescript
import type { Resource } from "@modelcontextprotocol/sdk/types";
import type { ResourceHandler, ResourceReadResult } from "./base.js";

/**
 * Registry for managing resource handlers
 * Orchestrates multiple handlers and routes requests to the appropriate one
 */
export class ResourceRegistry {
  private handlers: ResourceHandler[] = [];

  /**
   * Register a resource handler
   */
  register(handler: ResourceHandler): void {
    this.handlers.push(handler);
  }

  /**
   * List all resources from all registered handlers
   */
  async list(): Promise<Resource[]> {
    const allResources = await Promise.all(
      this.handlers.map(h => h.list())
    );
    return allResources.flat();
  }

  /**
   * Read a resource by URI
   * Routes to the appropriate handler based on URI prefix
   * @throws Error if no handler can handle the URI
   */
  async read(uri: string): Promise<ResourceReadResult> {
    const handler = this.handlers.find(h => h.canHandle(uri));

    if (!handler) {
      const registeredPrefixes = this.handlers.map(h => h.uriPrefix).join(', ');
      throw new Error(
        `No handler registered for resource URI: ${uri}\n` +
        `Registered prefixes: ${registeredPrefixes}`
      );
    }

    return handler.read(uri);
  }

  /**
   * Get a handler by URI prefix
   */
  getHandler(uriPrefix: string): ResourceHandler | undefined {
    return this.handlers.find(h => h.uriPrefix === uriPrefix);
  }

  /**
   * Get all registered handlers
   */
  getHandlers(): ResourceHandler[] {
    return [...this.handlers];
  }

  /**
   * Get registry statistics
   */
  getStats(): { totalHandlers: number; totalResources: Promise<number> } {
    return {
      totalHandlers: this.handlers.length,
      totalResources: this.list().then(resources => resources.length)
    };
  }
}
```

**Test**: `src/resources/__tests__/registry.test.ts`

```typescript
import { ResourceRegistry } from "../registry.js";
import { BaseResourceHandler } from "../base.js";
import type { Resource } from "@modelcontextprotocol/sdk/types";

class MockHandler extends BaseResourceHandler {
  constructor(public type: string, public uriPrefix: string, private resources: Resource[]) {
    super();
  }

  async list(): Promise<Resource[]> {
    return this.resources;
  }

  async read(uri: string): Promise<{ contents: any[] }> {
    this.validateUri(uri);
    return {
      contents: [{
        uri,
        mimeType: "application/json",
        text: "{}"
      }]
    };
  }
}

describe("ResourceRegistry", () => {
  let registry: ResourceRegistry;

  beforeEach(() => {
    registry = new ResourceRegistry();
  });

  it("should register handlers", () => {
    const handler = new MockHandler("test", "resource://test/", []);
    registry.register(handler);
    expect(registry.getHandlers()).toHaveLength(1);
  });

  it("should list resources from all handlers", async () => {
    const handler1 = new MockHandler("test1", "resource://test1/", [
      { uri: "resource://test1/a", name: "A", description: "Resource A" }
    ]);
    const handler2 = new MockHandler("test2", "resource://test2/", [
      { uri: "resource://test2/b", name: "B", description: "Resource B" }
    ]);

    registry.register(handler1);
    registry.register(handler2);

    const resources = await registry.list();
    expect(resources).toHaveLength(2);
    expect(resources.map(r => r.uri)).toEqual([
      "resource://test1/a",
      "resource://test2/b"
    ]);
  });

  it("should route read to correct handler", async () => {
    const handler1 = new MockHandler("test1", "resource://test1/", []);
    const handler2 = new MockHandler("test2", "resource://test2/", []);

    registry.register(handler1);
    registry.register(handler2);

    const result = await registry.read("resource://test2/example");
    expect(result.contents[0].uri).toBe("resource://test2/example");
  });

  it("should throw error for unknown URI", async () => {
    const handler = new MockHandler("test", "resource://test/", []);
    registry.register(handler);

    await expect(
      registry.read("resource://unknown/test")
    ).rejects.toThrow("No handler registered for resource URI");
  });

  it("should get handler by prefix", () => {
    const handler = new MockHandler("test", "resource://test/", []);
    registry.register(handler);

    const found = registry.getHandler("resource://test/");
    expect(found).toBe(handler);
  });
});
```

## Phase 2: Common Handlers (1-2 hours)

### Step 2.1: Config Resource Handler

**File**: `src/resources/handlers/config.ts`

```typescript
import type { Resource } from "@modelcontextprotocol/sdk/types";
import { BaseResourceHandler } from "../base.js";

export interface ConfigResourceOptions {
  /** Environment variables to expose (safe list) */
  safeEnvVars?: string[];
  /** Custom config object to expose */
  customConfig?: Record<string, any>;
}

/**
 * Handler for exposing server configuration
 * Only exposes safe, non-sensitive environment variables
 */
export class ConfigResourceHandler extends BaseResourceHandler {
  readonly type = "config";
  readonly uriPrefix = "resource://config/";

  constructor(private options: ConfigResourceOptions = {}) {
    super();
  }

  async list(): Promise<Resource[]> {
    return [{
      uri: "resource://config/environment",
      name: "Server Configuration",
      description: "Read-only environment and server settings",
      mimeType: "application/json"
    }];
  }

  async read(uri: string): Promise<{ contents: any[] }> {
    this.validateUri(uri);

    if (uri === "resource://config/environment") {
      const config: Record<string, any> = {
        node_version: process.version,
        platform: process.platform,
        ...this.options.customConfig
      };

      // Add safe environment variables
      if (this.options.safeEnvVars) {
        for (const envVar of this.options.safeEnvVars) {
          config[envVar.toLowerCase()] = process.env[envVar];
        }
      }

      return {
        contents: [{
          uri,
          mimeType: "application/json",
          text: JSON.stringify(config, null, 2)
        }]
      };
    }

    throw this.createNotFoundError(uri, ["resource://config/environment"]);
  }
}
```

### Step 2.2: Docs Resource Handler

**File**: `src/resources/handlers/docs.ts`

```typescript
import type { Resource } from "@modelcontextprotocol/sdk/types";
import { BaseResourceHandler } from "../base.js";

export type DocsContent = Record<string, string>;

/**
 * Handler for serving documentation
 * Takes a map of doc keys to markdown content
 */
export class DocsResourceHandler extends BaseResourceHandler {
  readonly type = "docs";
  readonly uriPrefix = "resource://docs/";

  constructor(private docs: DocsContent) {
    super();
  }

  async list(): Promise<Resource[]> {
    return Object.keys(this.docs).map(key => ({
      uri: `${this.uriPrefix}${key}`,
      name: this.formatName(key),
      description: `${this.formatName(key)} documentation`,
      mimeType: "text/markdown"
    }));
  }

  async read(uri: string): Promise<{ contents: any[] }> {
    this.validateUri(uri);

    const key = uri.slice(this.uriPrefix.length);
    const content = this.docs[key];

    if (!content) {
      const availableUris = Object.keys(this.docs).map(k => `${this.uriPrefix}${k}`);
      throw this.createNotFoundError(uri, availableUris);
    }

    return {
      contents: [{
        uri,
        mimeType: "text/markdown",
        text: content
      }]
    };
  }

  private formatName(key: string): string {
    return key
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }
}
```

### Step 2.3: Tool Resource Handler

**File**: `src/resources/handlers/tool.ts`

```typescript
import type { Resource } from "@modelcontextprotocol/sdk/types";
import { BaseResourceHandler } from "../base.js";

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: any;
}

export interface ToolProvider {
  getToolDefinitions(): ToolDefinition[];
  getToolDefinition(name: string): ToolDefinition | undefined;
}

/**
 * Handler for exposing tool descriptors as resources
 * Enables tool discovery via resources/list
 */
export class ToolResourceHandler extends BaseResourceHandler {
  readonly type = "tool";
  readonly uriPrefix = "resource://tool/";

  constructor(private toolProvider: ToolProvider) {
    super();
  }

  async list(): Promise<Resource[]> {
    const tools = this.toolProvider.getToolDefinitions();
    return tools.map(tool => ({
      uri: `${this.uriPrefix}${tool.name}`,
      name: tool.name,
      description: tool.description,
      mimeType: "application/json"
    }));
  }

  async read(uri: string): Promise<{ contents: any[] }> {
    this.validateUri(uri);

    const toolName = uri.slice(this.uriPrefix.length);
    const toolDef = this.toolProvider.getToolDefinition(toolName);

    if (!toolDef) {
      const available = this.toolProvider.getToolDefinitions()
        .map(t => `${this.uriPrefix}${t.name}`);
      throw this.createNotFoundError(uri, available);
    }

    return {
      contents: [{
        uri,
        mimeType: "application/json",
        text: JSON.stringify(toolDef, null, 2)
      }]
    };
  }
}
```

## Phase 3: Integration & Exports (30 minutes)

### Step 3.1: Create Index File

**File**: `src/resources/index.ts`

```typescript
// Base types and interfaces
export { BaseResourceHandler } from "./base.js";
export type { ResourceHandler, ResourceContent, ResourceReadResult } from "./base.js";

// Registry
export { ResourceRegistry } from "./registry.js";

// Common handlers
export { ConfigResourceHandler } from "./handlers/config.js";
export type { ConfigResourceOptions } from "./handlers/config.js";

export { DocsResourceHandler } from "./handlers/docs.js";
export type { DocsContent } from "./handlers/docs.js";

export { ToolResourceHandler } from "./handlers/tool.js";
export type { ToolDefinition, ToolProvider } from "./handlers/tool.js";
```

### Step 3.2: Update Main Index

**File**: `src/index.ts` (add these exports)

```typescript
// ... existing exports ...

// Resource system (v0.4.0)
export {
  BaseResourceHandler,
  ResourceRegistry,
  ConfigResourceHandler,
  DocsResourceHandler,
  ToolResourceHandler
} from "./resources/index.js";

export type {
  ResourceHandler,
  ResourceContent,
  ResourceReadResult,
  ConfigResourceOptions,
  DocsContent,
  ToolDefinition,
  ToolProvider
} from "./resources/index.js";
```

## Phase 4: Testing & Validation (1 hour)

### Step 4.1: Run Tests

```bash
cd mcp-framework
npm run build
npm test
```

### Step 4.2: Manual Integration Test

Create `test-resources.ts`:

```typescript
import {
  ResourceRegistry,
  ConfigResourceHandler,
  DocsResourceHandler,
  ToolResourceHandler
} from "./dist/index.js";

const registry = new ResourceRegistry();

// Config handler
registry.register(new ConfigResourceHandler({
  safeEnvVars: ['NODE_ENV'],
  customConfig: { version: '1.0.0' }
}));

// Docs handler
registry.register(new DocsResourceHandler({
  "readme": "# README\nTest documentation",
  "api": "# API\nAPI documentation"
}));

// Tool handler (mock)
const mockToolProvider = {
  getToolDefinitions: () => [
    { name: "test_tool", description: "A test tool", inputSchema: {} }
  ],
  getToolDefinition: (name: string) =>
    name === "test_tool" ? { name: "test_tool", description: "A test tool", inputSchema: {} } : undefined
};
registry.register(new ToolResourceHandler(mockToolProvider));

// Test list
console.log("Testing resources/list...");
registry.list().then(resources => {
  console.log(`Found ${resources.length} resources:`);
  resources.forEach(r => console.log(`  - ${r.uri}: ${r.name}`));
});

// Test read
console.log("\nTesting resources/read...");
registry.read("resource://config/environment").then(result => {
  console.log("Config resource:");
  console.log(result.contents[0].text);
});
```

Run: `node test-resources.ts`

Expected output:
```
Testing resources/list...
Found 4 resources:
  - resource://config/environment: Server Configuration
  - resource://docs/readme: Readme
  - resource://docs/api: Api
  - resource://tool/test_tool: test_tool

Testing resources/read...
Config resource:
{
  "node_version": "v20.x.x",
  "platform": "darwin",
  "version": "1.0.0",
  "node_env": "development"
}
```

## Phase 5: Documentation & Release (30 minutes)

### Step 5.1: Update Package.json

```json
{
  "name": "@debian777/mcp-framework",
  "version": "0.4.0",
  ...
}
```

### Step 5.2: Update CHANGELOG

Add to `CHANGELOG.md`:

```markdown
## [0.4.0] - 2025-10-08

### Added
- Resource system infrastructure
  - `BaseResourceHandler` - Abstract base class for resource handlers
  - `ResourceRegistry` - Central registry for managing handlers
  - `ConfigResourceHandler` - Generic config exposure
  - `DocsResourceHandler` - Documentation serving
  - `ToolResourceHandler` - Tool descriptor serving
- Full TypeScript support with proper interfaces
- Comprehensive test coverage for resource system

### Documentation
- Added resource system architecture documentation
- Added implementation guide
- Added API reference
- Added usage examples
```

### Step 5.3: Build & Publish

```bash
npm run build
npm test
npm publish
```

## Checklist

### Implementation
- [ ] Create `src/resources/base.ts`
- [ ] Create `src/resources/registry.ts`
- [ ] Create `src/resources/handlers/config.ts`
- [ ] Create `src/resources/handlers/docs.ts`
- [ ] Create `src/resources/handlers/tool.ts`
- [ ] Create `src/resources/index.ts`
- [ ] Update `src/index.ts` with exports

### Testing
- [ ] Write unit tests for `base.ts`
- [ ] Write unit tests for `registry.ts`
- [ ] Write unit tests for each handler
- [ ] Run `npm test` - all passing
- [ ] Manual integration test

### Documentation
- [ ] Update package.json to v0.4.0
- [ ] Update CHANGELOG.md
- [ ] Update README.md with resource system info
- [ ] Create API documentation

### Release
- [ ] Build passes (`npm run build`)
- [ ] Tests pass (`npm test`)
- [ ] TypeScript types generated
- [ ] Publish to npm

## Troubleshooting

### Issue: "Cannot find module '@modelcontextprotocol/sdk/types'"
**Fix**: Ensure MCP SDK is in dependencies or use inline types

### Issue: Tests fail with import errors
**Fix**: Check tsconfig.json has correct module resolution

### Issue: Handler not found
**Fix**: Verify handler is registered in registry before use

## Next Steps

After implementing framework v0.4.0:
1. Update mcp-memory to use new resource system
2. Create domain-specific handlers (Memory, Workflow, Telemetry)
3. Release mcp-memory v0.9.0

## Support

- Framework issues: https://github.com/debian777/mcp-framework/issues
- Questions: Create discussion in repo
