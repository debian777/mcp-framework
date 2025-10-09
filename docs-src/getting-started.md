# Getting Started

This guide will walk you through setting up and creating your first MCP server using mcp-framework.

## Prerequisites

- **Node.js 20+**: Required for ESM modules and modern JavaScript features
- **TypeScript**: For type-safe development (optional but recommended)
- **Basic MCP Knowledge**: Familiarity with the [Model Context Protocol](https://modelcontextprotocol.io/)

## Installation

Install mcp-framework using npm:

```bash
npm install @debian777/mcp-framework
```

Or using yarn:

```bash
yarn add @debian777/mcp-framework
```

## Basic Server Setup

Create a simple MCP server that responds to basic protocol messages:

```typescript
import { FrameworkBuilder } from '@debian777/mcp-framework';

// Create a basic MCP server
const server = await new FrameworkBuilder()
  .withTransport('stdio')  // Use STDIO transport for local development
  .build();

// Start the server
await server.start();
console.log('MCP server is running...');
```

Save this as `server.ts` and run it:

```bash
npx tsx server.ts
```

This creates a minimal MCP server that can handle the basic protocol handshake but doesn't provide any tools, resources, or prompts yet.

## Adding Providers

### Tool Provider

Tools allow AI assistants to perform actions. Here's how to create a calculator tool:

```typescript
import { ToolProvider } from '@debian777/mcp-framework';

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
      try {
        // Note: In production, use a safe math evaluation library
        const result = eval(args.expression);
        return {
          content: [{ type: 'text', text: `Result: ${result}` }]
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Error: Invalid expression` }],
          isError: true
        };
      }
    }
  }
}
```

### Resource Provider

Resources provide access to data that AI assistants can read:

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
    if (uri === 'file://workspace') {
      const files = await fs.readdir('.');
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({ files }, null, 2)
        }]
      };
    }
    throw new Error(`Unknown resource: ${uri}`);
  }
}
```

### Prompt Provider

Prompts provide reusable prompt templates:

```typescript
import { PromptProvider } from '@debian777/mcp-framework';

class CodeReviewProvider extends PromptProvider {
  getPromptDefinitions() {
    return [{
      name: 'code-review',
      description: 'Generate a code review prompt for the given code'
    }];
  }

  async getPrompt(name: string, args?: any) {
    if (name === 'code-review') {
      return {
        description: 'Code review assistant prompt',
        messages: [{
          role: 'user',
          content: {
            type: 'text',
            text: `Please review the following code for best practices, potential bugs, and improvements:\n\n${args?.code || 'No code provided'}`
          }
        }]
      };
    }
  }
}
```

## Complete Server Example

Now let's combine all providers into a complete server:

```typescript
import { FrameworkBuilder } from '@debian777/mcp-framework';
import { CalculatorProvider } from './providers/calculator.js';
import { FileSystemProvider } from './providers/filesystem.js';
import { CodeReviewProvider } from './providers/code-review.js';

// Create and configure the server
const server = await new FrameworkBuilder()
  .withTransport('stdio')
  .withStorage({ type: 'sqlite', path: './data.db' })
  .withToolProvider(new CalculatorProvider())
  .withResourceProvider(new FileSystemProvider())
  .withPromptProvider(new CodeReviewProvider())
  .build();

// Start the server
await server.start();
console.log('MCP server with calculator, filesystem, and code review providers is running...');
```

## Configuration

### Environment Variables

Configure your server using environment variables:

```bash
# Transport settings
MCP_TRANSPORT_MODE=stdio
MCP_HTTP_PORT=3000

# Storage settings
MCP_STORAGE_TYPE=sqlite
MCP_DATABASE_URL=./data.db

# Logging
MCP_LOG_LEVEL=debug
```

### Declarative Configuration

Create a `config.json` file for more complex configurations:

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

Load it in your server:

```typescript
import { FrameworkBuilder } from '@debian777/mcp-framework';

const server = await new FrameworkBuilder()
  .withConfigFile('./config.json')
  .withToolProvider(new CalculatorProvider())
  .build();
```

## Testing Your Server

Test your MCP server using the MCP Inspector:

```bash
# Install MCP Inspector globally
npm install -g @modelcontextprotocol/inspector

# Run your server with the inspector
mcp-inspector npx tsx server.ts
```

This will open a web interface where you can test your tools, resources, and prompts.

## Next Steps

- **[Core Concepts](core-concepts.md)**: Learn about the framework architecture
- **[Tools Guide](guides/tools.md)**: Deep dive into tool development
- **[Resources Guide](guides/resources.md)**: Learn about resource providers
- **[Examples](examples/)**: See more complete examples
- **[Deployment](guides/deployment.md)**: Deploy your server to production

## Troubleshooting

### Common Issues

**"Module not found" errors**
- Ensure you're using Node.js 20+
- Check that all dependencies are installed

**Transport connection errors**
- Verify the transport mode is correct for your use case
- Check that ports are available for HTTP transport

**Provider registration failures**
- Ensure your providers extend the correct abstract base classes
- Check that all required methods are implemented

### Getting Help

- **[GitHub Issues](https://github.com/debian777/mcp-framework/issues)**: Report bugs
- **[GitHub Discussions](https://github.com/debian777/mcp-framework/discussions)**: Ask questions
- **[Documentation](https://debian777.github.io/mcp-framework)**: Comprehensive guides