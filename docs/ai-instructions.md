# AI Instructions for mcp-framework

This document provides coding guidelines and best practices for AI agents working with the mcp-framework codebase.

## Core Principles

### Always Use TypeScript
- **Do**: Use TypeScript with strict type checking enabled
- **Don't**: Use plain JavaScript or disable strict type checking

```typescript
// ✅ Good
interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

// ❌ Bad
interface ToolDefinition {
  name: any;
  description: any;
  inputSchema: any;
}
```

### Validate with Zod
- **Do**: Use Zod schemas for runtime validation of all inputs
- **Don't**: Manually validate inputs or skip validation

```typescript
// ✅ Good
import { z } from 'zod';

const ToolParamsSchema = z.object({
  name: z.string().min(1),
  args: z.record(z.unknown())
});

export function validateToolParams(params: unknown) {
  return ToolParamsSchema.parse(params);
}

// ❌ Bad
export function validateToolParams(params: any) {
  if (!params.name) throw new Error('Name required');
  return params;
}
```

### Register Providers Declaratively
- **Do**: Register tools, resources, and prompts through provider classes
- **Don't**: Manually register handlers or use imperative APIs

```typescript
// ✅ Good
class CalculatorProvider extends ToolProvider {
  getToolDefinitions() {
    return [{
      name: 'add',
      description: 'Add two numbers',
      inputSchema: { /* schema */ }
    }];
  }

  async callTool(name: string, args: any) {
    if (name === 'add') {
      return args.a + args.b;
    }
  }
}

// Register with framework
const server = await new FrameworkBuilder()
  .withToolProvider(new CalculatorProvider())
  .build();

// ❌ Bad
// Manual handler registration
server.registerToolHandler('add', (args) => args.a + args.b);
```

## Do's and Don'ts

### ✅ Do's

- **Use async/await** for all asynchronous operations
- **Handle errors gracefully** with proper MCP error responses
- **Validate all inputs** before processing
- **Use meaningful variable names** and clear function signatures
- **Add JSDoc comments** for all public APIs
- **Follow conventional commits** for all changes
- **Write comprehensive tests** for all new functionality
- **Use the builder pattern** for server construction

### ❌ Don'ts

- **Don't use `any` types** except in migration code
- **Don't throw exceptions** in provider methods (return error responses instead)
- **Don't hardcode configuration** values
- **Don't skip input validation** for user-provided data
- **Don't use console.log** for logging (use the framework logger)
- **Don't create circular dependencies** between modules
- **Don't modify framework internals** (use extension points instead)

## Code Structure Guidelines

### File Organization
```
src/
├── framework/           # Framework core
│   ├── providers/       # Abstract provider classes
│   ├── registry/        # Provider registration
│   ├── server/          # Server implementation
│   └── config/          # Configuration handling
├── transport/           # Transport implementations
├── storage/            # Storage abstractions
├── types/              # TypeScript definitions
└── examples/           # Example implementations
```

### Provider Implementation Pattern

```typescript
import { ToolProvider } from '@debian777/mcp-framework';
import { z } from 'zod';

const ParamsSchema = z.object({
  input: z.string().min(1).max(1000)
});

export class MyToolProvider extends ToolProvider {
  getToolDefinitions() {
    return [{
      name: 'my-tool',
      description: 'Description of what this tool does',
      inputSchema: {
        type: 'object',
        properties: {
          input: {
            type: 'string',
            description: 'Input parameter description'
          }
        },
        required: ['input']
      }
    }];
  }

  async callTool(name: string, args: unknown, requestId?: string) {
    try {
      // Validate input
      const params = ParamsSchema.parse(args);

      // Implement tool logic
      const result = await this.processInput(params.input);

      // Return structured response
      return {
        content: [{
          type: 'text',
          text: `Processed: ${result}`
        }]
      };
    } catch (error) {
      // Return error response, don't throw
      return {
        content: [{
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  private async processInput(input: string): Promise<string> {
    // Implementation here
    return input.toUpperCase();
  }
}
```

## Error Handling Patterns

### MCP Error Responses
```typescript
// ✅ Good: Return structured error responses
return {
  content: [{ type: 'text', text: 'Invalid input provided' }],
  isError: true
};

// ❌ Bad: Throwing exceptions
throw new Error('Invalid input');
```

### Validation Errors
```typescript
// ✅ Good: Use Zod for validation with proper error handling
try {
  const params = ParamsSchema.parse(input);
  // Process params
} catch (error) {
  return {
    content: [{ type: 'text', text: `Validation error: ${error.message}` }],
    isError: true
  };
}
```

## Testing Guidelines

### Unit Tests
```typescript
import { describe, it, expect } from '@jest/globals';

describe('MyToolProvider', () => {
  const provider = new MyToolProvider();

  it('should return tool definitions', () => {
    const tools = provider.getToolDefinitions();
    expect(tools).toHaveLength(1);
    expect(tools[0].name).toBe('my-tool');
  });

  it('should process valid input', async () => {
    const result = await provider.callTool('my-tool', { input: 'test' });
    expect(result.content[0].text).toBe('Processed: TEST');
  });

  it('should handle invalid input', async () => {
    const result = await provider.callTool('my-tool', {});
    expect(result.isError).toBe(true);
  });
});
```

### Integration Tests
```typescript
import { FrameworkBuilder } from '@debian777/mcp-framework';

describe('Server Integration', () => {
  it('should handle tool calls', async () => {
    const server = await new FrameworkBuilder()
      .withTransport('stdio')
      .withToolProvider(new MyToolProvider())
      .build();

    // Test MCP protocol interactions
    const response = await server.handleRequest({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'my-tool',
        arguments: { input: 'test' }
      }
    });

    expect(response.result).toBeDefined();
  });
});
```

## Configuration Best Practices

### Environment Variables
```typescript
// ✅ Good: Use framework configuration loading
const config = getConfig();
const dbPath = config.database?.path || './data.db';

// ❌ Bad: Direct process.env access
const dbPath = process.env.DATABASE_URL || './data.db';
```

### Configuration Files
```json
{
  "server": {
    "name": "my-server",
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

## Performance Considerations

### Async Operations
```typescript
// ✅ Good: Proper async handling
async callTool(name: string, args: any) {
  const result = await this.expensiveOperation(args);
  return { content: [{ type: 'text', text: result }] };
}

// ❌ Bad: Blocking operations
callTool(name: string, args: any) {
  const result = fs.readFileSync(args.path); // Blocks!
  return { content: [{ type: 'text', text: result }] };
}
```

### Resource Management
```typescript
// ✅ Good: Proper cleanup
class DatabaseProvider extends ToolProvider {
  private connection?: DatabaseConnection;

  async initialize() {
    this.connection = await createConnection();
  }

  async destroy() {
    await this.connection?.close();
  }
}
```

## Security Guidelines

### Input Sanitization
```typescript
// ✅ Good: Sanitize all inputs
import { sanitizeForDatabase } from '@debian777/mcp-framework';

const sanitizedInput = sanitizeForDatabase(userInput);

// ❌ Bad: Direct use of user input
const query = `SELECT * FROM users WHERE name = '${userInput}'`; // SQL injection!
```

### Access Control
```typescript
// ✅ Good: Implement authorization checks
async callTool(name: string, args: any, context?: RequestContext) {
  if (!context?.user?.hasPermission('tool.execute')) {
    return {
      content: [{ type: 'text', text: 'Access denied' }],
      isError: true
    };
  }
  // Continue with tool execution
}
```

## Documentation Standards

### JSDoc Comments
```typescript
/**
 * Processes input using the specified algorithm
 * @param input - The input string to process
 * @param options - Processing options
 * @returns The processed result
 * @throws {ValidationError} When input validation fails
 */
async function processInput(
  input: string,
  options: ProcessingOptions = {}
): Promise<string> {
  // Implementation
}
```

### README Updates
- Update README.md for all new features
- Include code examples for common use cases
- Document breaking changes and migration guides
- Keep API documentation current

## Git Workflow

### Conventional Commits
```bash
# ✅ Good commit messages
feat: add calculator tool provider
fix: handle division by zero in calculator
docs: update getting started guide
refactor: simplify provider registration API

# ❌ Bad commit messages
fixed bug
updated code
changes
```

### Branch Naming
```bash
# ✅ Good branch names
feature/add-calculator-provider
fix/handle-validation-errors
docs/update-ai-instructions

# ❌ Bad branch names
my-changes
bugfix
update
```

## Debugging Tips

### Logging
```typescript
// ✅ Good: Use structured logging
import { logger } from '@debian777/mcp-framework';

logger.info('Processing tool call', {
  toolName: name,
  requestId,
  inputSize: JSON.stringify(args).length
});

// ❌ Bad: Console logging
console.log('Processing', name, args);
```

### Error Context
```typescript
// ✅ Good: Include context in errors
try {
  await processData(args);
} catch (error) {
  logger.error('Data processing failed', {
    toolName: name,
    requestId,
    error: error.message,
    args: sanitizeForLogging(args)
  });
  return {
    content: [{ type: 'text', text: 'Processing failed' }],
    isError: true
  };
}
```

## Code Review Checklist

- [ ] TypeScript types are correct and specific
- [ ] Input validation is implemented with Zod
- [ ] Error handling returns structured responses
- [ ] Async operations use proper await patterns
- [ ] JSDoc comments document public APIs
- [ ] Tests cover happy path and error cases
- [ ] Code follows established patterns
- [ ] Security considerations are addressed
- [ ] Performance implications are considered
- [ ] Documentation is updated