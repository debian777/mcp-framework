# Core Concepts

This guide explains the fundamental concepts and architecture of mcp-framework. Understanding these concepts is essential for building effective MCP servers.

## Model Context Protocol (MCP)

MCP is an open protocol that standardizes how AI assistants can securely access external tools and resources. It defines a JSON-RPC-based communication protocol between:

- **MCP Clients**: AI assistants (like Claude, ChatGPT) that want to use external capabilities
- **MCP Servers**: Applications that provide tools, resources, and prompts to clients

### Protocol Components

MCP defines three main types of capabilities:

1. **Tools**: Actions that clients can invoke to perform tasks
2. **Resources**: Data sources that clients can read from
3. **Prompts**: Reusable prompt templates for consistent interactions

## Framework Architecture

mcp-framework provides a clean separation between protocol implementation and business logic:

```
Framework Layer (mcp-framework)
├── Transport Layer (STDIO, HTTP, WebSocket)
├── JSON-RPC Protocol Handler
├── Provider Registry
└── Infrastructure (Storage, Logging, Security)

Business Logic Layer (Your Code)
├── ToolProvider implementations
├── ResourceProvider implementations
└── PromptProvider implementations
```

### Key Principles

- **Separation of Concerns**: Framework handles protocol, you handle business logic
- **Provider Pattern**: Abstract base classes define contracts for implementations
- **Plugin Architecture**: Dynamic registration and discovery of providers
- **Type Safety**: Full TypeScript support with strict type checking

## Providers

Providers are the core abstraction in mcp-framework. They encapsulate business logic and define how your MCP server interacts with the world.

### ToolProvider

Tools allow AI assistants to perform actions in your system.

```typescript
abstract class ToolProvider {
  abstract getToolDefinitions(): ToolDefinition[];
  abstract callTool(name: string, args: any, requestId?: string): Promise<any>;
}
```

**Key Concepts:**
- **Tool Definitions**: Metadata about available tools (name, description, parameters)
- **Tool Execution**: Actual implementation of tool logic
- **Error Handling**: Proper error responses for failed operations

### ResourceProvider

Resources provide access to data that AI assistants can read.

```typescript
abstract class ResourceProvider {
  abstract getStaticResources(): Resource[];
  abstract readResource(uri: string): Promise<ResourceContent>;
}
```

**Key Concepts:**
- **Static Resources**: Pre-defined resources with fixed URIs
- **Dynamic Resources**: Resources discovered at runtime
- **URI Schemes**: Custom URI schemes for organizing resources
- **Content Types**: Proper MIME type handling

### PromptProvider

Prompts provide reusable prompt templates for consistent AI interactions.

```typescript
abstract class PromptProvider {
  abstract getPromptDefinitions(): PromptDefinition[];
  abstract getPrompt(name: string, args?: any): Promise<PromptContent>;
}
```

**Key Concepts:**
- **Prompt Templates**: Reusable prompt structures
- **Parameterization**: Dynamic prompt content based on arguments
- **Message Sequences**: Multi-turn conversation templates

## Transport Layer

The transport layer handles communication between MCP clients and servers.

### STDIO Transport

Used for local development and direct process communication:

```typescript
const server = await new FrameworkBuilder()
  .withTransport('stdio')
  .build();
```

**Use Cases:**
- Local development and testing
- Direct process integration
- Simple deployment scenarios

### HTTP Transport

Used for remote communication and web-based deployments:

```typescript
const server = await new FrameworkBuilder()
  .withTransport({
    mode: 'http',
    port: 3000,
    path: '/mcp'
  })
  .build();
```

**Features:**
- RESTful endpoints for MCP protocol
- Health check endpoints
- Metrics and monitoring
- CORS support

### WebSocket Transport

For real-time, bidirectional communication:

```typescript
const server = await new FrameworkBuilder()
  .withTransport({
    mode: 'websocket',
    port: 3001,
    path: '/mcp-ws'
  })
  .build();
```

## Storage Abstraction

mcp-framework provides a unified storage interface for persisting data:

```typescript
interface StorageInterface {
  save(input: SaveInput): Promise<MemoryItem>;
  load(filter: LoadFilter): Promise<MemoryItem[]>;
  update(id: string, input: UpdateInput): Promise<MemoryItem>;
  delete(id: string): Promise<void>;
}
```

### Built-in Backends

- **SQLite**: Local file-based storage, good for development
- **PostgreSQL**: Production-ready relational database
- **Custom**: Implement your own storage backend

### Storage Configuration

```typescript
const server = await new FrameworkBuilder()
  .withStorage({
    type: 'sqlite',
    path: './data.db'
  })
  .build();
```

## Configuration System

mcp-framework supports multiple configuration approaches:

### Environment Variables

```bash
MCP_TRANSPORT_MODE=stdio
MCP_STORAGE_TYPE=sqlite
MCP_LOG_LEVEL=debug
```

### Configuration Files

```json
{
  "server": {
    "name": "my-mcp-server",
    "version": "1.0.0"
  },
  "transport": {
    "modes": ["stdio"],
    "maxConcurrency": 16
  },
  "storage": {
    "type": "sqlite",
    "path": "./data.db"
  }
}
```

### Programmatic Configuration

```typescript
const server = await new FrameworkBuilder()
  .withTransport('stdio')
  .withStorage({ type: 'sqlite', path: './data.db' })
  .withToolProvider(new MyToolProvider())
  .build();
```

## Error Handling

mcp-framework provides comprehensive error handling:

### MCP Error Codes

- `-32700`: Parse error
- `-32600`: Invalid request
- `-32601`: Method not found
- `-32602`: Invalid params
- `-32603`: Internal error
- `-32000`: Server error (custom)

### Error Responses

```typescript
return {
  jsonrpc: '2.0',
  id: requestId,
  error: {
    code: -32000,
    message: 'Something went wrong',
    data: { details: 'Additional error information' }
  }
};
```

### Framework Error Handling

The framework automatically handles:
- Transport-level errors
- JSON-RPC protocol errors
- Provider execution errors
- Configuration validation errors

## Security Considerations

### Input Validation

- All inputs validated against schemas
- Type coercion and sanitization
- Size limits enforced
- SQL injection prevention

### Authentication & Authorization

- Framework provides auth hooks
- Implementations define specific mechanisms
- Secure credential storage
- Token validation and refresh

### Transport Security

- STDIO transport for local communication
- HTTPS support for HTTP transport
- Connection encryption
- Certificate validation

## Performance Optimization

### Connection Pooling

- Database connection pooling
- HTTP client connection reuse
- Resource cleanup on shutdown
- Connection health monitoring

### Caching

- Built-in caching for expensive operations
- Configurable TTL and size limits
- Cache invalidation strategies
- Memory-efficient implementations

### Monitoring

- Health check endpoints
- Performance metrics
- Request tracing
- Error tracking

## Plugin System

mcp-framework supports dynamic provider loading:

### Plugin Discovery

```typescript
const server = await new FrameworkBuilder()
  .withPluginDiscovery({
    directories: ['./plugins'],
    npmPackages: ['@my-org/mcp-plugins']
  })
  .build();
```

### Plugin Structure

```
my-plugin/
├── package.json
├── src/
│   └── index.ts  // Exports provider instances
└── dist/
    └── index.js
```

## Best Practices

### Provider Design

- **Single Responsibility**: Each provider should do one thing well
- **Error Resilience**: Handle errors gracefully and provide meaningful messages
- **Type Safety**: Use TypeScript interfaces for all data structures
- **Documentation**: Provide clear descriptions for tools, resources, and prompts

### Performance

- **Async Operations**: Use async/await for all I/O operations
- **Resource Limits**: Implement timeouts and size limits
- **Caching**: Cache expensive operations when appropriate
- **Monitoring**: Add logging and metrics for observability

### Security

- **Input Validation**: Validate all inputs, never trust user data
- **Error Messages**: Don't leak sensitive information in error messages
- **Access Control**: Implement proper authorization checks
- **Secure Defaults**: Use secure defaults for all configuration options

### Testing

- **Unit Tests**: Test individual provider methods
- **Integration Tests**: Test complete server functionality
- **Mock Providers**: Use mock implementations for testing
- **MCP Inspector**: Test with the official MCP Inspector tool

## Migration Guide

### From Custom MCP Servers

If you're migrating from a custom MCP server implementation:

1. **Identify Components**: Extract your tools, resources, and prompts
2. **Create Providers**: Implement the appropriate provider interfaces
3. **Update Configuration**: Migrate to framework configuration system
4. **Test Thoroughly**: Ensure all functionality works as expected

### From Other Frameworks

When migrating from other MCP frameworks:

1. **Preserve Business Logic**: Keep your core functionality intact
2. **Adapt Interfaces**: Update to mcp-framework provider interfaces
3. **Update Dependencies**: Replace old framework dependencies
4. **Test Integration**: Verify compatibility with your MCP clients

## Advanced Topics

- **[Plugin Development](guides/tools.md#plugin-development)**
- **[Custom Storage Backends](guides/deployment.md#custom-storage)**
- **[Transport Extensions](guides/transports.md#custom-transports)**
- **[Performance Tuning](guides/deployment.md#performance-tuning)**

## Next Steps

Now that you understand the core concepts:

- **[Getting Started](getting-started.md)**: Create your first MCP server
- **[Tools Guide](guides/tools.md)**: Learn about tool development
- **[Examples](examples/)**: See complete working examples
- **[API Reference](reference/)**: Detailed API documentation