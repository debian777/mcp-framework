# MCP Framework - Resource System Documentation

## Overview

This directory contains the architecture and implementation plan for adding a **Resource System** to `@debian777/mcp-framework` (v0.4.0).

The Resource System provides generic, reusable infrastructure for MCP servers to expose resources via the standard `resources/list` and `resources/read` methods.

## What Gets Added

### New Package Exports

```typescript
// Base infrastructure
export { BaseResourceHandler } from "./resources/base.js";
export type { ResourceHandler, ResourceContent, ResourceReadResult } from "./resources/base.js";

// Registry
export { ResourceRegistry } from "./resources/registry.js";

// Common handlers
export { ConfigResourceHandler } from "./resources/handlers/config.js";
export type { ConfigResourceOptions } from "./resources/handlers/config.js";

export { DocsResourceHandler } from "./resources/handlers/docs.js";
export type { DocsContent } from "./resources/handlers/docs.js";

export { ToolResourceHandler } from "./resources/handlers/tool.js";
export type { ToolDefinition, ToolProvider } from "./resources/handlers/tool.js";
```

### Directory Structure

```
src/
├── resources/
│   ├── base.ts                     # BaseResourceHandler, interfaces
│   ├── registry.ts                 # ResourceRegistry
│   ├── handlers/
│   │   ├── config.ts               # ConfigResourceHandler
│   │   ├── docs.ts                 # DocsResourceHandler
│   │   └── tool.ts                 # ToolResourceHandler
│   └── index.ts                    # Exports
└── index.ts                        # Updated to export resources
```

## Quick Start

### For Framework Maintainers

1. Read [IMPLEMENTATION.md](IMPLEMENTATION.md) for detailed implementation steps
2. Follow the implementation checklist
3. Run tests and validate
4. Publish v0.4.0

### For Server Developers (using framework)

```typescript
import {
  ResourceRegistry,
  ConfigResourceHandler,
  DocsResourceHandler,
  ToolResourceHandler
} from "@debian777/mcp-framework";

// Create registry
const registry = new ResourceRegistry();

// Register framework-provided handlers
registry.register(new DocsResourceHandler(myDocs));
registry.register(new ConfigResourceHandler({ safeEnvVars: ['LOG_LEVEL'] }));
registry.register(new ToolResourceHandler(myToolRegistry));

// In JSON-RPC handler:
if (method === "resources/list") {
  const resources = await registry.list();
  return { resources };
}

if (method === "resources/read") {
  const result = await registry.read(params.uri);
  return result;
}
```

## Architecture Principles

### 1. **Generic & Reusable**
All components work for ANY MCP server, not just mcp-memory

### 2. **Handler-Based**
Each resource type implemented as a handler extending `BaseResourceHandler`

### 3. **Extensible**
Servers can add custom handlers by extending `BaseResourceHandler`

### 4. **Type-Safe**
Full TypeScript support with proper interfaces

### 5. **MCP-Compliant**
Follows MCP resource specification patterns

## Key Design Decisions

### What Goes in Framework

✅ **Base Infrastructure**
- `BaseResourceHandler` - Abstract base class
- `ResourceRegistry` - Handler orchestration
- Common interfaces and types

✅ **Common Handlers**
- `ConfigResourceHandler` - Environment variable exposure
- `DocsResourceHandler` - Documentation serving
- `ToolResourceHandler` - Tool descriptor serving

### What Stays in Servers

❌ **Domain-Specific Handlers**
- Memory-specific resources
- Workflow-specific resources
- Server-specific telemetry

### Why This Split?

- **Reusability**: Generic code shared across all MCP servers
- **Maintainability**: Core logic in one place
- **Flexibility**: Servers customize without touching framework

## Usage Examples

### Example 1: Basic Setup

```typescript
// server.ts
import { ResourceRegistry, DocsResourceHandler } from "@debian777/mcp-framework";

const docs = {
  "quickstart": "# Quick Start\n...",
  "api-reference": "# API Reference\n..."
};

const registry = new ResourceRegistry();
registry.register(new DocsResourceHandler(docs));

// Handler
async function handleResourcesList() {
  return { resources: await registry.list() };
}

async function handleResourcesRead(uri: string) {
  return await registry.read(uri);
}
```

### Example 2: Custom Handler

```typescript
// my-custom-handler.ts
import { BaseResourceHandler } from "@debian777/mcp-framework";

export class DatabaseResourceHandler extends BaseResourceHandler {
  readonly type = "database";
  readonly uriPrefix = "resource://database/";

  constructor(private db: Database) {
    super();
  }

  async list(): Promise<Resource[]> {
    return [{
      uri: "resource://database/stats",
      name: "Database Statistics",
      description: "Current database statistics",
      mimeType: "application/json"
    }];
  }

  async read(uri: string): Promise<{ contents: any[] }> {
    this.validateUri(uri);

    if (uri === "resource://database/stats") {
      const stats = await this.db.getStats();
      return {
        contents: [{
          uri,
          mimeType: "application/json",
          text: JSON.stringify(stats, null, 2)
        }]
      };
    }

    throw this.createNotFoundError(uri, ["resource://database/stats"]);
  }
}

// Usage
registry.register(new DatabaseResourceHandler(myDatabase));
```

### Example 3: Config Handler with Custom Settings

```typescript
import { ConfigResourceHandler } from "@debian777/mcp-framework";

const configHandler = new ConfigResourceHandler({
  safeEnvVars: ['LOG_LEVEL', 'PORT', 'NODE_ENV'],
  customConfig: {
    version: '1.0.0',
    features: ['memory', 'workflow'],
    limits: {
      maxItems: 10000,
      maxSize: 1024 * 1024
    }
  }
});

registry.register(configHandler);

// Exposes: resource://config/environment
```

## Implementation Timeline

- **Week 1**: Implement base infrastructure (base.ts, registry.ts)
- **Week 2**: Implement common handlers (config, docs, tool)
- **Week 3**: Testing & documentation
- **Week 4**: Release v0.4.0

**Estimated Effort**: 2-3 hours implementation, 1 hour testing

## Benefits

### For Framework
✅ Adds standard resource capability
✅ Enables code reuse across servers
✅ Establishes patterns for future features

### For Servers
✅ Ready-to-use config/docs/tool handlers
✅ Clean abstraction for custom resources
✅ Consistent error handling
✅ Type-safe implementation

### For AI Agents
✅ Self-service discovery via `resources/list`
✅ Standardized resource access
✅ Tool descriptors for exploration

## Testing Strategy

```typescript
// base.test.ts
describe("BaseResourceHandler", () => {
  it("validates URI prefix");
  it("creates helpful error messages");
});

// registry.test.ts
describe("ResourceRegistry", () => {
  it("lists all resources from all handlers");
  it("routes read to correct handler");
  it("throws error for unknown URI");
});

// handlers/*.test.ts
describe("Each Handler", () => {
  it("lists its resources");
  it("reads valid URIs");
  it("rejects invalid URIs");
});
```

## Migration Notes

### Breaking Changes
**None** - This is a new feature, purely additive.

### Deprecations
**None**

### Version Bump
- From: `0.3.4`
- To: `0.4.0` (minor bump for new feature)

## Related Documentation

- [IMPLEMENTATION.md](IMPLEMENTATION.md) - Detailed implementation guide
- [API.md](API.md) - Complete API reference
- [EXAMPLES.md](EXAMPLES.md) - More usage examples
- [mcp-memory integration](../../../mcp-memory/.ai/mcp-memory-resources/SEPARATION_STRATEGY.md) - How mcp-memory uses this

## Support

- **Framework Issues**: https://github.com/debian777/mcp-framework/issues
- **MCP Spec**: https://spec.modelcontextprotocol.io
- **Discussion**: Framework maintainers channel

## Next Steps

1. ✅ Read this README (you are here)
2. ⬜ Review [IMPLEMENTATION.md](IMPLEMENTATION.md)
3. ⬜ Implement base infrastructure
4. ⬜ Implement handlers
5. ⬜ Write tests
6. ⬜ Update exports
7. ⬜ Publish v0.4.0

---

**Status**: Ready for implementation
**Target Version**: 0.4.0
**Estimated Effort**: 3-4 hours
**Priority**: High (enables mcp-memory v0.9.0)
