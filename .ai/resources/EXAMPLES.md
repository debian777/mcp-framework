# MCP Framework Resources - Usage Examples

## Example 1: Basic Server with Docs

```typescript
import {
  ResourceRegistry,
  DocsResourceHandler
} from "@debian777/mcp-framework";

// Prepare documentation
const docs = {
  "quickstart": `# Quick Start

1. Install the server
2. Configure your settings
3. Start using tools`,

  "api-reference": `# API Reference

## Tools

### tool_name
Description of the tool...`
};

// Create registry and register handler
const resourceRegistry = new ResourceRegistry();
resourceRegistry.register(new DocsResourceHandler(docs));

// In your JSON-RPC handler:
async function handleRequest(request: any) {
  if (request.method === "resources/list") {
    const resources = await resourceRegistry.list();
    return { jsonrpc: "2.0", id: request.id, result: { resources } };
  }

  if (request.method === "resources/read") {
    const { uri } = request.params;
    const result = await resourceRegistry.read(uri);
    return { jsonrpc: "2.0", id: request.id, result };
  }
}
```

## Example 2: Config Handler with Safe Variables

```typescript
import { ConfigResourceHandler } from "@debian777/mcp-framework";

// Only expose safe environment variables
const configHandler = new ConfigResourceHandler({
  safeEnvVars: [
    'NODE_ENV',
    'LOG_LEVEL',
    'PORT'
  ],
  customConfig: {
    version: '2.0.0',
    features: ['caching', 'compression'],
    limits: {
      maxRequests: 1000,
      maxSize: 10485760  // 10MB
    }
  }
});

registry.register(configHandler);

// Exposes: resource://config/environment
// Content includes: node_version, platform, node_env, log_level, port, version, features, limits
// Does NOT include: DATABASE_URL, API_KEYS, etc.
```

## Example 3: Tool Registry Integration

```typescript
import { ToolResourceHandler } from "@debian777/mcp-framework";

// Your existing tool registry
class MyToolRegistry {
  private tools = new Map();

  register(tool: { name: string; description: string; inputSchema: any }) {
    this.tools.set(tool.name, tool);
  }

  // Implement ToolProvider interface
  getToolDefinitions() {
    return Array.from(this.tools.values());
  }

  getToolDefinition(name: string) {
    return this.tools.get(name);
  }
}

// Use with ToolResourceHandler
const toolRegistry = new MyToolRegistry();
toolRegistry.register({
  name: "search",
  description: "Search for items",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string" }
    }
  }
});

const toolHandler = new ToolResourceHandler(toolRegistry);
registry.register(toolHandler);

// Now agents can discover tools via:
// resources/list -> finds resource://tool/search
// resources/read -> gets full tool definition with schema
```

## Example 4: Custom Database Handler

```typescript
import { BaseResourceHandler } from "@debian777/mcp-framework";
import type { Resource } from "@modelcontextprotocol/sdk/types";

class DatabaseResourceHandler extends BaseResourceHandler {
  readonly type = "database";
  readonly uriPrefix = "resource://database/";

  constructor(private db: DatabaseConnection) {
    super();
  }

  async list(): Promise<Resource[]> {
    return [
      {
        uri: "resource://database/stats",
        name: "Database Statistics",
        description: "Current database connection and query statistics",
        mimeType: "application/json"
      },
      {
        uri: "resource://database/schema",
        name: "Database Schema",
        description: "Current database schema information",
        mimeType: "application/json"
      }
    ];
  }

  async read(uri: string): Promise<{ contents: any[] }> {
    this.validateUri(uri);

    if (uri === "resource://database/stats") {
      const stats = {
        connections: await this.db.getConnectionCount(),
        queries_per_second: await this.db.getQPS(),
        cache_hit_rate: await this.db.getCacheHitRate(),
        uptime_seconds: await this.db.getUptime()
      };

      return {
        contents: [{
          uri,
          mimeType: "application/json",
          text: JSON.stringify(stats, null, 2)
        }]
      };
    }

    if (uri === "resource://database/schema") {
      const schema = await this.db.getSchema();
      return {
        contents: [{
          uri,
          mimeType: "application/json",
          text: JSON.stringify(schema, null, 2)
        }]
      };
    }

    throw this.createNotFoundError(uri, [
      "resource://database/stats",
      "resource://database/schema"
    ]);
  }
}

// Usage
registry.register(new DatabaseResourceHandler(myDatabase));
```

## Example 5: Multi-Handler Server

```typescript
import {
  ResourceRegistry,
  ConfigResourceHandler,
  DocsResourceHandler,
  ToolResourceHandler
} from "@debian777/mcp-framework";

// Complete server setup
const registry = new ResourceRegistry();

// 1. Config handler
registry.register(new ConfigResourceHandler({
  safeEnvVars: ['LOG_LEVEL', 'PORT'],
  customConfig: {
    serverName: 'my-mcp-server',
    version: '1.0.0'
  }
}));

// 2. Docs handler
registry.register(new DocsResourceHandler({
  "quickstart": "# Quick Start\n...",
  "api": "# API\n...",
  "troubleshooting": "# Troubleshooting\n..."
}));

// 3. Tool handler
registry.register(new ToolResourceHandler(toolRegistry));

// 4. Custom handler
registry.register(new DatabaseResourceHandler(db));

// Now your server exposes:
// - resource://config/environment
// - resource://docs/quickstart
// - resource://docs/api
// - resource://docs/troubleshooting
// - resource://tool/* (all your tools)
// - resource://database/stats
// - resource://database/schema
```

## Example 6: Dynamic Resource Generation

```typescript
class UserResourceHandler extends BaseResourceHandler {
  readonly type = "user";
  readonly uriPrefix = "resource://user/";

  constructor(private userService: UserService) {
    super();
  }

  async list(): Promise<Resource[]> {
    // Dynamically list resources based on current users
    const users = await this.userService.getActiveUsers();

    return users.map(user => ({
      uri: `resource://user/${user.id}`,
      name: `User: ${user.name}`,
      description: `Profile for user ${user.name}`,
      mimeType: "application/json"
    }));
  }

  async read(uri: string): Promise<{ contents: any[] }> {
    this.validateUri(uri);

    const userId = uri.slice(this.uriPrefix.length);
    const user = await this.userService.getUserById(userId);

    if (!user) {
      const activeUsers = await this.userService.getActiveUsers();
      const availableUris = activeUsers.map(u => `resource://user/${u.id}`);
      throw this.createNotFoundError(uri, availableUris);
    }

    // Return user profile (sanitized)
    return {
      contents: [{
        uri,
        mimeType: "application/json",
        text: JSON.stringify({
          id: user.id,
          name: user.name,
          email: user.email,
          created_at: user.createdAt
        }, null, 2)
      }]
    };
  }
}
```

## Example 7: Caching Layer

```typescript
class CachedResourceHandler extends BaseResourceHandler {
  private cache = new Map<string, { data: any; expiry: number }>();
  private cacheTTL = 60000; // 1 minute

  constructor(
    private innerHandler: ResourceHandler
  ) {
    super();
  }

  get type() { return this.innerHandler.type; }
  get uriPrefix() { return this.innerHandler.uriPrefix; }

  async list(): Promise<Resource[]> {
    return this.innerHandler.list();
  }

  async read(uri: string): Promise<{ contents: any[] }> {
    const now = Date.now();
    const cached = this.cache.get(uri);

    if (cached && cached.expiry > now) {
      return cached.data;
    }

    const result = await this.innerHandler.read(uri);
    this.cache.set(uri, {
      data: result,
      expiry: now + this.cacheTTL
    });

    return result;
  }
}

// Usage
const dbHandler = new DatabaseResourceHandler(db);
const cachedDbHandler = new CachedResourceHandler(dbHandler);
registry.register(cachedDbHandler);
```

## Example 8: Error Handling Patterns

```typescript
// In your server
async function handleResourcesRead(uri: string) {
  try {
    const result = await resourceRegistry.read(uri);
    return {
      jsonrpc: "2.0",
      id: requestId,
      result
    };
  } catch (error) {
    // Classify error type
    let code = -32000; // Generic error
    let message = error.message;

    if (error.message.includes("No handler registered")) {
      code = -32601; // Method not found equivalent
      message = `Resource not supported: ${uri}`;
    } else if (error.message.includes("Resource not found")) {
      code = -32602; // Invalid params
      message = error.message; // Already has helpful details
    }

    return {
      jsonrpc: "2.0",
      id: requestId,
      error: { code, message }
    };
  }
}
```

## Example 9: Testing Custom Handlers

```typescript
import { describe, it, expect } from "@jest/globals";

describe("CustomResourceHandler", () => {
  let handler: CustomResourceHandler;

  beforeEach(() => {
    handler = new CustomResourceHandler(mockDependency);
  });

  it("should list resources", async () => {
    const resources = await handler.list();
    expect(resources).toHaveLength(2);
    expect(resources[0].uri).toBe("resource://custom/item1");
  });

  it("should read valid resource", async () => {
    const result = await handler.read("resource://custom/item1");
    expect(result.contents).toHaveLength(1);
    expect(result.contents[0].mimeType).toBe("application/json");
  });

  it("should reject invalid URI", async () => {
    await expect(
      handler.read("resource://invalid/test")
    ).rejects.toThrow("Invalid URI");
  });

  it("should reject unknown resource", async () => {
    await expect(
      handler.read("resource://custom/unknown")
    ).rejects.toThrow("Resource not found");
  });
});
```

## Example 10: TypeScript Usage

```typescript
import type {
  ResourceHandler,
  ResourceContent,
  ResourceReadResult,
  ToolProvider
} from "@debian777/mcp-framework";

// Type-safe custom handler
class TypedHandler implements ResourceHandler {
  readonly type: string = "typed";
  readonly uriPrefix: string = "resource://typed/";

  canHandle(uri: string): boolean {
    return uri.startsWith(this.uriPrefix);
  }

  async list(): Promise<Resource[]> {
    return [];
  }

  async read(uri: string): Promise<ResourceReadResult> {
    const content: ResourceContent = {
      uri,
      mimeType: "application/json",
      text: "{}"
    };
    return { contents: [content] };
  }
}

// Type-safe tool provider
class TypedToolProvider implements ToolProvider {
  getToolDefinitions(): ToolDefinition[] {
    return [];
  }

  getToolDefinition(name: string): ToolDefinition | undefined {
    return undefined;
  }
}
```

## Common Patterns

### Pattern: Lazy Loading

```typescript
class LazyDocsHandler extends BaseResourceHandler {
  readonly type = "docs";
  readonly uriPrefix = "resource://docs/";

  async list(): Promise<Resource[]> {
    const files = await fs.readdir('./docs');
    return files.map(file => ({
      uri: `resource://docs/${file}`,
      name: file,
      description: `Documentation: ${file}`
    }));
  }

  async read(uri: string): Promise<{ contents: any[] }> {
    const filename = uri.slice(this.uriPrefix.length);
    const content = await fs.readFile(`./docs/${filename}`, 'utf-8');
    return {
      contents: [{ uri, mimeType: "text/markdown", text: content }]
    };
  }
}
```

### Pattern: Validation

```typescript
class ValidatedHandler extends BaseResourceHandler {
  async read(uri: string): Promise<{ contents: any[] }> {
    // Always validate first
    this.validateUri(uri);

    // Extract and validate parameters
    const id = uri.slice(this.uriPrefix.length);
    if (!/^[a-z0-9-]+$/.test(id)) {
      throw new Error(`Invalid resource ID: ${id}`);
    }

    // Proceed with read
    // ...
  }
}
```

### Pattern: Composition

```typescript
// Combine multiple handlers
const registry = new ResourceRegistry();

[
  new ConfigResourceHandler(configOpts),
  new DocsResourceHandler(docs),
  new ToolResourceHandler(tools),
  new CustomHandler1(dep1),
  new CustomHandler2(dep2)
].forEach(handler => registry.register(handler));
```
