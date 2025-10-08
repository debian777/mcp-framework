# MCP Framework Resources - API Reference

## Core Classes

### BaseResourceHandler

Abstract base class for all resource handlers.

```typescript
abstract class BaseResourceHandler implements ResourceHandler {
  abstract readonly type: string;
  abstract readonly uriPrefix: string;

  canHandle(uri: string): boolean;
  abstract list(): Promise<Resource[]>;
  abstract read(uri: string): Promise<ResourceReadResult>;

  protected validateUri(uri: string): void;
  protected createNotFoundError(uri: string, availableUris: string[]): Error;
}
```

**Methods:**
- `canHandle(uri)` - Check if handler can process this URI
- `list()` - Return all resources this handler provides
- `read(uri)` - Read and return resource content
- `validateUri(uri)` - Validate URI matches prefix (throws on error)
- `createNotFoundError(uri, available)` - Create helpful error message

---

### ResourceRegistry

Central registry for managing resource handlers.

```typescript
class ResourceRegistry {
  register(handler: ResourceHandler): void;
  async list(): Promise<Resource[]>;
  async read(uri: string): Promise<ResourceReadResult>;
  getHandler(uriPrefix: string): ResourceHandler | undefined;
  getHandlers(): ResourceHandler[];
  getStats(): { totalHandlers: number; totalResources: Promise<number> };
}
```

**Methods:**
- `register(handler)` - Add a handler to the registry
- `list()` - List all resources from all handlers
- `read(uri)` - Read resource by URI (routes to appropriate handler)
- `getHandler(prefix)` - Get handler by URI prefix
- `getHandlers()` - Get all registered handlers
- `getStats()` - Get registry statistics

---

### ConfigResourceHandler

Handler for exposing server configuration.

```typescript
class ConfigResourceHandler extends BaseResourceHandler {
  constructor(options?: ConfigResourceOptions);
  readonly type = "config";
  readonly uriPrefix = "resource://config/";
}

interface ConfigResourceOptions {
  safeEnvVars?: string[];
  customConfig?: Record<string, any>;
}
```

**Resources Provided:**
- `resource://config/environment` - Server configuration

**Configuration:**
- `safeEnvVars` - List of environment variables to expose
- `customConfig` - Custom config object to merge in

---

### DocsResourceHandler

Handler for serving documentation.

```typescript
class DocsResourceHandler extends BaseResourceHandler {
  constructor(docs: DocsContent);
  readonly type = "docs";
  readonly uriPrefix = "resource://docs/";
}

type DocsContent = Record<string, string>;
```

**Resources Provided:**
- `resource://docs/{key}` - One per key in docs object

**Content Format:**
- Keys: document identifiers (e.g., "quickstart", "api-reference")
- Values: Markdown content as strings

---

### ToolResourceHandler

Handler for exposing tool descriptors.

```typescript
class ToolResourceHandler extends BaseResourceHandler {
  constructor(toolProvider: ToolProvider);
  readonly type = "tool";
  readonly uriPrefix = "resource://tool/";
}

interface ToolProvider {
  getToolDefinitions(): ToolDefinition[];
  getToolDefinition(name: string): ToolDefinition | undefined;
}

interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: any;
}
```

**Resources Provided:**
- `resource://tool/{name}` - One per tool in provider

## Interfaces

### ResourceHandler

```typescript
interface ResourceHandler {
  readonly type: string;
  readonly uriPrefix: string;
  canHandle(uri: string): boolean;
  list(): Promise<Resource[]>;
  read(uri: string): Promise<ResourceReadResult>;
}
```

### ResourceContent

```typescript
interface ResourceContent {
  uri: string;
  mimeType: string;
  text?: string;
  blob?: string;
}
```

### ResourceReadResult

```typescript
interface ResourceReadResult {
  contents: ResourceContent[];
}
```

## Usage Patterns

### Basic Setup

```typescript
import { ResourceRegistry, DocsResourceHandler } from "@debian777/mcp-framework";

const registry = new ResourceRegistry();
registry.register(new DocsResourceHandler({
  "readme": "# README\nContent here..."
}));

// In your server:
const resources = await registry.list();
const content = await registry.read("resource://docs/readme");
```

### Custom Handler

```typescript
import { BaseResourceHandler } from "@debian777/mcp-framework";

class MyHandler extends BaseResourceHandler {
  readonly type = "custom";
  readonly uriPrefix = "resource://custom/";

  async list(): Promise<Resource[]> {
    return [{ uri: "resource://custom/data", name: "Data", description: "..." }];
  }

  async read(uri: string): Promise<ResourceReadResult> {
    this.validateUri(uri);
    // ... implementation
  }
}
```

### Error Handling

```typescript
try {
  const result = await registry.read(uri);
} catch (error) {
  if (error.message.includes("No handler registered")) {
    // URI not supported
  } else if (error.message.includes("Resource not found")) {
    // Resource doesn't exist
  }
}
```

## Type Exports

```typescript
import type {
  ResourceHandler,
  ResourceContent,
  ResourceReadResult,
  ConfigResourceOptions,
  DocsContent,
  ToolDefinition,
  ToolProvider
} from "@debian777/mcp-framework";
```
