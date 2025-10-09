# MCP Framework Core Concepts

**Build production-ready MCP servers in minutes, not days.** This guide explains the fundamental concepts and architecture of mcp-framework—a modern, type-safe framework that handles all the protocol complexity so you can focus on building amazing AI integrations.

## Why MCP Framework?

### The Problem
Building MCP servers from scratch means dealing with:
- ❌ Complex JSON-RPC protocol implementation
- ❌ Transport layer configuration (STDIO, HTTP, WebSocket)
- ❌ Input validation and security concerns
- ❌ Boilerplate code for capability negotiation
- ❌ Storage and persistence setup

### The Solution
**mcp-framework** provides:
- ✅ **Provider-based architecture** - Implement simple abstract classes, get full MCP compliance
- ✅ **Production-ready infrastructure** - Security, validation, logging, monitoring built-in
- ✅ **Flexible transports** - STDIO for local, HTTP/WebSocket for remote—one line of code
- ✅ **Type-safe APIs** - Full TypeScript support with strict checking
- ✅ **Quick start** - From zero to working MCP server in under 5 minutes

## Model Context Protocol (MCP)

MCP is an open protocol that standardizes how AI assistants can securely access external tools and resources. Think of it as a **universal plugin system for AI**—enabling Claude, ChatGPT, and other assistants to integrate with any external system through a consistent interface.

### The Protocol Architecture

```
┌─────────────────┐         JSON-RPC         ┌─────────────────┐
│   MCP Client    │◄────────────────────────►│   MCP Server    │
│  (Claude, etc)  │    Tools, Resources      │  (Your Code)    │
└─────────────────┘        Prompts           └─────────────────┘
```

- **MCP Clients**: AI assistants that want to use external capabilities
- **MCP Servers**: Your applications that provide tools, resources, and prompts

### Three Core Capabilities

MCP defines three types of capabilities that make AI integrations powerful:

1. **🔧 Tools**: Actions that clients can invoke (e.g., "send_email", "query_database", "deploy_code")
2. **📚 Resources**: Data sources that clients can read (e.g., files, documents, API responses)
3. **💬 Prompts**: Reusable prompt templates for consistent AI interactions

## Framework Architecture

mcp-framework uses a **clean separation of concerns** that lets you focus on your domain logic while the framework handles all protocol complexity:

```
┌─────────────────────────────────────────────────────┐
│         Framework Layer (mcp-framework)             │
│  ┌────────────────────────────────────────────┐    │
│  │  Transport: STDIO │ HTTP │ WebSocket       │    │
│  ├────────────────────────────────────────────┤    │
│  │  JSON-RPC Protocol Handler                 │    │
│  ├────────────────────────────────────────────┤    │
│  │  Provider Registry & Lifecycle             │    │
│  ├────────────────────────────────────────────┤    │
│  │  Storage │ Security │ Logging │ Monitoring │    │
│  └────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
                         ▲
                         │ Simple Abstract Classes
                         ▼
┌─────────────────────────────────────────────────────┐
│        Business Logic Layer (Your Code)             │
│  ┌────────────────────────────────────────────┐    │
│  │  ToolProvider implementations              │    │
│  │  ResourceProvider implementations          │    │
│  │  PromptProvider implementations            │    │
│  └────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

### Design Principles

🎯 **Separation of Concerns**: Framework handles protocol, you handle business logic
🔌 **Provider Pattern**: Implement abstract base classes, get full MCP compliance
🧩 **Plugin Architecture**: Dynamic registration and discovery of providers
🛡️ **Type Safety**: Full TypeScript support with strict type checking
⚡ **Performance First**: Built-in caching, connection pooling, and optimization
📊 **Observable**: Structured logging, metrics, and health checks out of the box

## Providers: Your Path to MCP Compliance

Providers are the **only code you need to write**. Extend abstract base classes, implement a few methods, and you have a production-ready MCP server. No protocol knowledge required.

### 🔧 ToolProvider - Give AI the Power to Act

Tools let AI assistants **perform actions** in your systems. Think: sending emails, querying databases, deploying code, managing infrastructure.

```typescript
import { ToolProvider } from '@debian777/mcp-framework';

class DeploymentProvider extends ToolProvider {
  getToolDefinitions() {
    return [{
      name: 'deploy_app',
      description: 'Deploy application to production',
      inputSchema: {
        type: 'object',
        properties: {
          app: { type: 'string', description: 'Application name' },
          version: { type: 'string', description: 'Version to deploy' }
        },
        required: ['app', 'version']
      }
    }];
  }

  async callTool(name: string, args: any) {
    if (name === 'deploy_app') {
      // Your deployment logic here
      const result = await this.deployToProduction(args.app, args.version);
      return {
        content: [{
          type: 'text',
          text: `✅ Deployed ${args.app}@${args.version} to production`
        }]
      };
    }
  }
}
```

**What you get:**
- ✅ Input validation against your schema (automatic)
- ✅ Error handling with MCP-compliant responses
- ✅ Request tracking and logging
- ✅ Full TypeScript type safety

### 📚 ResourceProvider - Feed AI with Context

Resources let AI assistants **read data** from your systems. Think: documentation, logs, configurations, database records, file systems.

```typescript
import { ResourceProvider } from '@debian777/mcp-framework';

class DocsProvider extends ResourceProvider {
  getStaticResources() {
    return [{
      uri: 'docs://api/getting-started',
      name: 'Getting Started Guide',
      description: 'Introduction to our API',
      mimeType: 'text/markdown'
    }];
  }

  async readResource(uri: string) {
    // Load documentation from your source
    const content = await this.loadDocumentation(uri);

    return {
      contents: [{
        uri,
        mimeType: 'text/markdown',
        text: content
      }]
    };
  }
}
```

**Powerful features:**
- 📂 **Static & Dynamic Resources**: Pre-defined or runtime-discovered
- 🔗 **Custom URI Schemes**: `docs://`, `db://`, `git://` - organize however you want
- 🎭 **MIME Type Support**: Text, JSON, binary - proper content type handling
- 🔄 **Resource Templates**: Dynamic URI generation with parameters

### 💬 PromptProvider - Standardize AI Interactions

Prompts create **reusable templates** for consistent AI interactions. Perfect for code reviews, incident response, documentation generation—any workflow that needs consistent prompting.

```typescript
import { PromptProvider } from '@debian777/mcp-framework';

class CodeReviewProvider extends PromptProvider {
  getPromptDefinitions() {
    return [{
      name: 'review_pr',
      description: 'Review pull request for best practices',
      arguments: [{
        name: 'pr_number',
        description: 'Pull request number',
        required: true
      }]
    }];
  }

  async getPrompt(name: string, args?: any) {
    const prData = await this.fetchPR(args.pr_number);

    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Review PR #${args.pr_number}:\n${prData.diff}`
          }
        }
      ]
    };
  }
}
```

**Use cases:**
- 📝 Code review templates
- 🚨 Incident response workflows
- 📖 Documentation generation
- 🔍 Analysis and reporting

## Transport Layer: One Line Configuration

Switch between local and remote deployments **without changing your provider code**. The framework handles all the protocol complexity.

### 🖥️ STDIO Transport - Local & Fast

Perfect for local development, CLI tools, and direct process integration:

```typescript
// One line - that's it!
const server = await new FrameworkBuilder()
  .withTransport('stdio')
  .build();
```

**When to use:**
- ✅ Local development and testing
- ✅ CLI tool integration
- ✅ Desktop applications
- ✅ Process-to-process communication

### 🌐 HTTP Transport - Remote & Scalable

Deploy your MCP server as a web service:

```typescript
const server = await new FrameworkBuilder()
  .withTransport({
    mode: 'http',
    port: 3000,
    path: '/mcp'
  })
  .build();
```

**Built-in features:**
- 🏥 Health check endpoints (`/health`)
- 📊 Metrics and monitoring (`/metrics`)
- 🔐 CORS support
- 📝 OpenAPI documentation
- ⚡ Connection pooling

### ⚡ WebSocket Transport - Real-time

For persistent connections and real-time bidirectional communication:

```typescript
const server = await new FrameworkBuilder()
  .withTransport({
    mode: 'websocket',
    port: 3001,
    path: '/mcp-ws'
  })
  .build();
```

**Perfect for:**
- 🔄 Real-time updates
- 📡 Streaming data
- 💬 Interactive sessions
- 🎮 Low-latency applications

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

## Best Practices for Hackathon Success

### 🎯 Provider Design

**Single Responsibility**
Each provider focuses on one domain. Better to have 3 small providers than 1 giant one.

```typescript
✅ Good: EmailProvider, SlackProvider, PagerDutyProvider
❌ Bad: NotificationProvider (doing everything)
```

**Type Safety First**
Use TypeScript interfaces—catch errors at compile time, not runtime.

```typescript
interface DeploymentArgs {
  app: string;
  version: string;
  environment: 'staging' | 'production';
}

async callTool(name: string, args: DeploymentArgs) { /* ... */ }
```

**Clear Documentation**
AI assistants read your descriptions—make them count!

```typescript
✅ Good: "Deploy application to production environment with health checks"
❌ Bad: "Deploy stuff"
```

### ⚡ Performance Tips

**Async Everything**
Use `async/await` for all I/O operations—never block the event loop.

**Smart Caching**
Cache expensive operations, but invalidate properly:

```typescript
private cache = new Map<string, { data: any, timestamp: number }>();

async readResource(uri: string) {
  const cached = this.cache.get(uri);
  if (cached && Date.now() - cached.timestamp < 60000) {
    return cached.data;  // Cache hit!
  }
  // Fetch fresh data...
}
```

**Resource Limits**
Always implement timeouts and size limits:

```typescript
const result = await Promise.race([
  this.expensiveOperation(),
  new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Timeout')), 5000)
  )
]);
```

### 🛡️ Security Essentials

**Validate Everything**
The framework validates against your schemas, but add business logic checks:

```typescript
async callTool(name: string, args: any) {
  // Schema validation happens automatically
  // Add business logic validation:
  if (args.amount > MAX_ALLOWED) {
    throw new Error('Amount exceeds limit');
  }
}
```

**Safe Error Messages**
Don't leak internal details:

```typescript
✅ Good: "Database connection failed"
❌ Bad: "Connection to postgres://admin:pass123@internal-db:5432 failed"
```

**Access Control**
Implement authorization checks for sensitive operations:

```typescript
async callTool(name: string, args: any, requestId?: string) {
  if (name === 'delete_production_data') {
    // Check permissions before executing!
    await this.checkAdminPermission(requestId);
  }
}
```

### 🧪 Testing Strategy

**Quick Testing with MCP Inspector**
Test your server in minutes:

```bash
npm install -g @modelcontextprotocol/inspector
mcp-inspector node dist/server.js
```

**Unit Test Your Providers**
Test business logic independently:

```typescript
describe('EmailProvider', () => {
  it('sends email with correct parameters', async () => {
    const provider = new EmailProvider();
    const result = await provider.callTool('send_email', {
      to: 'test@example.com',
      subject: 'Test'
    });
    expect(result.content[0].text).toContain('Email sent');
  });
});
```

**Integration Tests**
Test the complete server:

```typescript
const server = await new FrameworkBuilder()
  .withTransport('stdio')
  .withToolProvider(new EmailProvider())
  .build();

await server.start();
// Test MCP protocol interactions...
```

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

## Quick Start: Build Your First MCP Server

Ready to start building? Here's a complete working example:

```typescript
import { FrameworkBuilder, ToolProvider } from '@debian777/mcp-framework';

// 1. Create your provider
class HackerProvider extends ToolProvider {
  getToolDefinitions() {
    return [{
      name: 'hack_the_planet',
      description: 'The classic hack',
      inputSchema: {
        type: 'object',
        properties: {
          target: { type: 'string' }
        },
        required: ['target']
      }
    }];
  }

  async callTool(name: string, args: any) {
    return {
      content: [{
        type: 'text',
        text: `🎯 ${args.target} has been hacked! (Just kidding 😉)`
      }]
    };
  }
}

// 2. Build and start server (3 lines!)
const server = await new FrameworkBuilder()
  .withTransport('stdio')
  .withToolProvider(new HackerProvider())
  .build();

await server.start();
```

**That's it!** You now have a working MCP server. 🚀

## Hackathon Pro Tips

### 🏆 Winning Strategy

1. **Start Simple**: Get one provider working end-to-end first
2. **Use Examples**: Copy from [examples/](../examples/) directory
3. **Test Early**: Use MCP Inspector to test as you build
4. **Add Polish**: Health checks, logging, metrics make you stand out
5. **Document**: Great README = great impression

### ⏱️ Time-Saving Shortcuts

**Use the builder pattern:**
```typescript
const server = await new FrameworkBuilder()
  .withTransport('stdio')
  .withStorage({ type: 'sqlite', path: './data.db' })
  .withToolProvider(provider1)
  .withToolProvider(provider2)  // Chain multiple providers!
  .withResourceProvider(provider3)
  .build();
```

**Enable debug logging:**
```bash
MCP_LOG_LEVEL=debug node dist/server.js
```

**Test with curl (HTTP transport):**
```bash
curl http://localhost:3000/health
curl http://localhost:3000/mcp -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
```

### 🎪 Demo Ideas

- 🤖 **DevOps Assistant**: Deploy, monitor, rollback with AI
- 📊 **Analytics Explorer**: Query databases, generate reports
- 🔐 **Security Toolkit**: Scan, audit, generate policies
- 📝 **Documentation Bot**: Generate docs from code
- 🎮 **Game Master**: AI-powered game mechanics

## Next Steps

🚀 **[Getting Started Guide](getting-started.md)** - Your first MCP server in 5 minutes
🔧 **[Tools Guide](guides/tools.md)** - Deep dive into tool development
📚 **[Examples](examples/)** - Complete working examples
📖 **[API Reference](reference/)** - Detailed API documentation

---

**Questions?** Check out our [GitHub Discussions](https://github.com/debian777/mcp-framework/discussions) or dive into the code!

*Built for the Model Context Protocol ecosystem. Made for hackathons. Designed for production.* 🎯