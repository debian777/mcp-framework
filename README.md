# MCP Framework

[![npm version](https://badge.fury.io/js/%40debian777%2Fmcp-framework.svg)](https://badge.fury.io/js/%40debian777%2Fmcp-framework)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A modern, provider-based framework for building Model Context Protocol (MCP) servers. Clean separation between framework infrastructure and business logic through abstract provider classes and plugin registry system.

## Features

### 🏗️ **Provider Architecture**
- **Abstract Base Classes**: Clean contracts for `ResourceProvider`, `ToolProvider`, and `PromptProvider`
- **Plugin Registry**: Dynamic provider registration and lifecycle management
- **Framework Separation**: Protocol handling vs business logic isolation

### 🔧 **Core Infrastructure**
- **Transport Layers**: STDIO and HTTP transport implementations
- **Storage Abstraction**: SQLite/PostgreSQL backends with unified interface
- **Security**: Input sanitization, validation, URI scheme enforcement, and access control
- **Logging**: Structured logging with configurable levels and formats, MCP capability negotiation
- **Standards Compliance**: Full MCP protocol compliance with error codes, URI validation, and capabilities

### 🚀 **Developer Experience**
- **TypeScript First**: Full type safety with strict checking
- **Builder Pattern**: Fluent API for server construction
- **Configuration Support**: JSON/YAML declarative configuration with environment variable interpolation
- **Plugin Discovery**: Automatic provider loading from directories and NPM packages

### 📦 **Production Ready**
- **Health Monitoring**: Built-in health checks and metrics endpoints
- **Error Handling**: Comprehensive error management with MCP-compliant responses
- **Performance**: Connection pooling, caching, and optimization features
- **Security**: Input validation, SQL injection prevention, XSS protection

## Quick Start

### Installation

```bash
npm install @debian777/mcp-framework
```

### Basic Server Setup

```typescript
import { FrameworkBuilder } from '@debian777/mcp-framework';

// Create a simple MCP server
const server = await new FrameworkBuilder()
  .withTransport('stdio')
  .withStorage({ type: 'sqlite', path: './data.db' })
  .build();

await server.start();
```

### MCP Client Usage

Connect to external MCP servers (like context7) using the built-in client:

```typescript
import { McpClient, StdioClientTransport } from '@debian777/mcp-framework';

// Connect to an MCP server
const transport = new StdioClientTransport('node', ['path/to/mcp-server.js']);
const client = new McpClient(transport);

await client.connect();
await client.initialize();

// Use server capabilities
const tools = await client.listTools();
const result = await client.callTool('some-tool', { param: 'value' });

// Sampling (if server supports it)
const sample = await client.sample({
  messages: [{ role: 'user', content: { type: 'text', text: 'Hello!' } }]
});

await client.disconnect();
```

### Adding Providers

```typescript
import { FrameworkBuilder, ToolProvider } from '@debian777/mcp-framework';

class CalculatorProvider extends ToolProvider {
  getToolDefinitions() {
    return [{
      name: 'calculate',
      description: 'Perform mathematical calculations',
      inputSchema: {
        type: 'object',
        properties: {
          expression: { type: 'string', description: 'Math expression to evaluate' }
        },
        required: ['expression']
      }
    }];
  }

  async callTool(name: string, args: any) {
    if (name === 'calculate') {
      // Implementation here
      return { result: eval(args.expression) };
    }
  }
}

const server = await new FrameworkBuilder()
  .withTransport('stdio')
  .withToolProvider(new CalculatorProvider())
  .build();

await server.start();
```

## Architecture

### Provider Pattern

The framework uses a clean separation between protocol handling and business logic:

```
Framework (mcp-framework)
├── Transport Layer (STDIO, HTTP)
├── JSON-RPC Protocol
├── Provider Registry
└── Infrastructure (Storage, Logging, Security)

Business Logic (Your Code)
├── ResourceProvider implementations
├── ToolProvider implementations
└── PromptProvider implementations
```

### Core Components

| Component | Purpose | Key Classes |
|-----------|---------|-------------|
| **Transport** | Communication protocols | `StdioTransport`, `HttpTransport` |
| **Server** | MCP protocol implementation | `FrameworkServer` |
| **Providers** | Business logic abstraction | `ToolProvider`, `ResourceProvider`, `PromptProvider` |
| **Registry** | Provider management | `ProviderRegistry` |
| **Storage** | Data persistence | `StorageInterface`, `SqliteStorage`, `PostgresStorage` |
| **Builder** | Fluent server construction | `FrameworkBuilder` |

## Configuration

### Declarative Configuration

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
  },
  "logging": {
    "level": "info",
    "format": "json"
  }
}
```

### Environment Variables

```bash
# Transport
MCP_TRANSPORT_MODE=stdio,http
MCP_HTTP_PORT=3000

# Storage
MCP_STORAGE_TYPE=sqlite
MCP_DATABASE_URL=./data.db

# Logging
MCP_LOG_LEVEL=debug
MCP_LOG_FORMAT=json

# Security
MCP_INPUT_MAX_SIZE=1048576
```

## API Reference

### FrameworkBuilder

Fluent API for constructing MCP servers:

```typescript
const builder = new FrameworkBuilder();

// Configure transport
builder.withTransport('stdio');
builder.withTransport({ mode: 'http', port: 3000 });

// Add providers
builder.withToolProvider(new MyToolProvider());
builder.withResourceProvider(new MyResourceProvider());
builder.withPromptProvider(new MyPromptProvider());

// Configure storage
builder.withStorage({ type: 'sqlite', path: './data.db' });

// Build server
const server = await builder.build();
```

### Provider Interfaces

#### ToolProvider
```typescript
abstract class ToolProvider {
  abstract getToolDefinitions(): ToolDefinition[];
  abstract callTool(name: string, args: any, requestId?: string): Promise<any>;
}
```

#### ResourceProvider
```typescript
abstract class ResourceProvider {
  abstract getStaticResources(): Resource[];
  abstract readResource(uri: string): Promise<ResourceContent>;
}
```

#### PromptProvider
```typescript
abstract class PromptProvider {
  abstract getPromptDefinitions(): PromptDefinition[];
  abstract getPrompt(name: string, args?: any): Promise<PromptContent>;
}
```

## Examples

### File System Resource Provider

```typescript
import { ResourceProvider } from '@debian777/mcp-framework';

class FileSystemProvider extends ResourceProvider {
  getStaticResources() {
    return [{
      uri: 'file://workspace',
      name: 'Workspace Files',
      description: 'Access to workspace files',
      mimeType: 'application/json'
    }];
  }

  async readResource(uri: string) {
    const path = uri.replace('file://', '');
    const content = await fs.readFile(path, 'utf-8');
    return {
      contents: [{
        uri,
        mimeType: 'text/plain',
        text: content
      }]
    };
  }
}
```

### Calculator Tool Provider

```typescript
import { ToolProvider } from '@debian777/mcp-framework';

class CalculatorProvider extends ToolProvider {
  getToolDefinitions() {
    return [{
      name: 'add',
      description: 'Add two numbers',
      inputSchema: {
        type: 'object',
        properties: {
          a: { type: 'number' },
          b: { type: 'number' }
        },
        required: ['a', 'b']
      }
    }];
  }

  async callTool(name: string, args: any) {
    if (name === 'add') {
      const result = args.a + args.b;
      return {
        content: [{ type: 'text', text: `Result: ${result}` }]
      };
    }
  }
}
```

## Development

### Setup

```bash
# Clone repository
git clone <repository-url>
cd mcp-framework

# Install dependencies
npm install

# Build project
npm run build

# Run tests
npm test

# Development mode
npm run dev
```

### Project Structure

```
mcp-framework/
├── src/
│   ├── framework/
│   │   ├── providers/        # Abstract provider base classes
│   │   ├── registry/         # Provider registry system
│   │   ├── server/           # Framework server implementation
│   │   ├── builder.ts        # Fluent builder API
│   │   └── config/           # Configuration management
│   ├── transport/            # Transport layer implementations
│   ├── storage/              # Storage abstractions and backends
│   ├── types/                # TypeScript type definitions
│   └── examples/             # Provider implementation examples
├── docs/                     # Documentation
│   ├── guides/              # User guides
│   ├── development/         # Development docs
│   ├── api/                 # API documentation
│   └── adr/                 # Architecture decision records
├── tests/                   # Test suites
└── package.json
```

### Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run integration tests
npm run test:integration

# Run specific test file
npm test -- src/framework/registry/provider-registry.test.ts
```

## Deployment

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

### Production Checklist

- [ ] Environment variables configured
- [ ] Database connections tested
- [ ] Health endpoints responding
- [ ] Logging configured appropriately
- [ ] SSL certificates installed (for HTTP transport)
- [ ] Monitoring and alerting set up
- [ ] Backup strategies implemented

## Security

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

## Troubleshooting

### Common Issues

**Transport Connection Failed**
```
Error: Transport connection refused
```
- Verify transport mode configuration
- Check port availability for HTTP transport
- Ensure proper permissions for STDIO

**Provider Registration Failed**
```
Error: Provider validation failed
```
- Implement all required abstract methods
- Validate provider schemas
- Check provider dependencies

**Storage Connection Error**
```
Error: Database connection failed
```
- Verify database URL and credentials
- Check database server status
- Validate connection pool settings

### Debug Mode

Enable detailed logging:
```bash
MCP_LOG_LEVEL=debug npm start
```

### Health Checks

Monitor server health:
```bash
curl http://localhost:3000/health
```

## Contributing

We welcome contributions! Please see our [contributing guide](docs/development/contributing.md) for details.

### Development Workflow

1. **Architect First**: Create ADR for non-trivial changes
2. **Small Changes**: Keep diffs focused and minimal
3. **Test Coverage**: Maintain >80% test coverage
4. **Documentation**: Update docs for API changes
5. **Conventional Commits**: Use semantic commit messages

### Code Standards

- **TypeScript**: Strict type checking enabled
- **ESLint**: Code quality and style enforcement
- **Prettier**: Consistent code formatting
- **Jest**: Comprehensive test suite
- **Commitlint**: Conventional commit validation

## MCP Standards Compliance

The framework implements full MCP (Model Context Protocol) standards compliance:

### ✅ **Implemented Standards**
- **Error Codes**: Standardized JSON-RPC error codes aligned with MCP specification
- **URI Schemes**: Validation of `https://`, `file://`, and `git://` schemes for resources
- **Capabilities Negotiation**: Complete capability exchange during initialization including logging
- **Resource Templates**: Support for dynamic resource URI generation
- **Client Support**: Full MCP client implementation with sampling capabilities
- **Protocol Compliance**: Full adherence to MCP protocol version 2024-11-05

## Compatibility

See [COMPATIBILITY.md](docs/api/COMPATIBILITY.md) for version support matrix and deprecation policy.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Related Projects

- [mcp-memory](https://github.com/debian777/mcp-memory) - Memory management MCP server built with this framework
- [MCP Protocol Specification](https://modelcontextprotocol.io/specification) - Official MCP protocol documentation

## Support

- **Documentation**: [Full API Reference](docs/api/)
- **Issues**: [GitHub Issues](https://github.com/debian777/mcp-framework/issues)
- **Discussions**: [GitHub Discussions](https://github.com/debian777/mcp-framework/discussions)

---

*Built with ❤️ for the Model Context Protocol ecosystem*
