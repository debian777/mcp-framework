# Overview

Welcome to **mcp-framework**, a modern, provider-based framework for building Model Context Protocol (MCP) servers. This framework provides clean separation between protocol implementation and business logic through abstract provider classes and plugin registry system.

## What is MCP?

The [Model Context Protocol](https://modelcontextprotocol.io/) is an open standard that enables AI assistants to securely access external tools and resources. MCP servers provide tools, resources, and prompts that AI models can use to perform tasks.

## Why mcp-framework?

### 🏗️ **Provider Architecture**
- **Abstract Base Classes**: Clean contracts for `ResourceProvider`, `ToolProvider`, and `PromptProvider`
- **Plugin Registry**: Dynamic provider registration and lifecycle management
- **Framework Separation**: Protocol handling vs business logic isolation

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

## Quick Example

```typescript
import { FrameworkBuilder } from '@debian777/mcp-framework';

// Create a simple MCP server
const server = await new FrameworkBuilder()
  .withTransport('stdio')
  .withStorage({ type: 'sqlite', path: './data.db' })
  .build();

await server.start();
```

## Architecture Overview

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

## Key Components

| Component | Purpose | Key Classes |
|-----------|---------|-------------|
| **Transport** | Communication protocols | `StdioTransport`, `HttpTransport` |
| **Server** | MCP protocol implementation | `FrameworkServer` |
| **Providers** | Business logic abstraction | `ToolProvider`, `ResourceProvider`, `PromptProvider` |
| **Registry** | Provider management | `ProviderRegistry` |
| **Builder** | Fluent server construction | `FrameworkBuilder` |

## Getting Started

1. **[Installation](getting-started.md#installation)**: Add mcp-framework to your project
2. **[Basic Server](getting-started.md#basic-server-setup)**: Create your first MCP server
3. **[Adding Providers](getting-started.md#adding-providers)**: Implement tools, resources, and prompts
4. **[Configuration](getting-started.md#configuration)**: Configure your server for production

## Community & Support

- **📖 [Documentation](https://debian777.github.io/mcp-framework)**: Comprehensive guides and API reference
- **🐛 [Issues](https://github.com/debian777/mcp-framework/issues)**: Report bugs and request features
- **💬 [Discussions](https://github.com/debian777/mcp-framework/discussions)**: Ask questions and share ideas
- **📦 [NPM](https://www.npmjs.com/package/@debian777/mcp-framework)**: Install the framework

## License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

---

*Built with ❤️ for the Model Context Protocol ecosystem*