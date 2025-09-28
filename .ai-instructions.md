# AI Instructions for mcp-framework

## Overview
This is the core MCP framework library providing shared infrastructure for building Model Context Protocol servers. It contains base classes, transport layers, utilities, and common functionality used by other MCP implementations.

## Architecture

### Core Components
- **Server**: Base MCP server implementation with JSON-RPC handling
- **Transport**: STDIO and HTTP transport layers
- **Storage**: Abstract storage interfaces with SQLite and PostgreSQL backends
- **Security**: Input sanitization and validation utilities
- **Logging**: Structured logging with configurable levels
- **Health**: Health check endpoints and monitoring
- **Paging**: Cursor-based pagination for large datasets
- **Retry**: Exponential backoff retry logic
- **Errors**: Standardized error handling and responses

### Key Classes
- `MCPServer`: Main server class implementing MCP protocol
- `Transport`: Abstract base for transport implementations
- `StorageInterface`: Abstract storage operations
- `Logger`: Structured logging utility
- `HealthChecker`: Health monitoring component

## Development Guidelines

### Code Style
- TypeScript with strict type checking
- Async/await patterns throughout
- Error-first callback conventions where applicable
- Comprehensive JSDoc documentation
- Conventional commit messages (enforced by commitlint)

### Testing
- Unit tests for all utilities and classes
- Integration tests for transport layers
- Mock implementations for external dependencies
- Test coverage >80%

### Dependencies
- Minimal external dependencies
- Framework-agnostic design
- Node.js 20+ compatibility
- ESM module format

## API Design Patterns

### Server Implementation
```typescript
import { MCPServer } from '@mcp-framework/server';

const server = new MCPServer({
  name: 'my-server',
  version: '1.0.0',
  capabilities: {
    tools: {},
    resources: {},
    prompts: {}
  }
});

// Register tools
server.setRequestHandler('tools/call', async (request) => {
  // Tool implementation
});

// Start server
await server.start();
```

### Storage Abstraction
```typescript
import { StorageFactory } from '@mcp-framework/storage';

const storage = StorageFactory.create({
  type: 'sqlite',
  path: './data.db'
});

// CRUD operations
await storage.store('key', { data: 'value' });
const data = await storage.retrieve('key');
```

### Error Handling
```typescript
import { MCPError, ErrorCodes } from '@mcp-framework/errors';

throw new MCPError(
  ErrorCodes.InvalidRequest,
  'Invalid request parameters'
);
```

## Configuration

### Environment Variables
- `LOG_LEVEL`: Logging verbosity (debug, info, warn, error)
- `STORAGE_TYPE`: Storage backend (sqlite, postgres)
- `DATABASE_URL`: Database connection string
- `HEALTH_CHECK_INTERVAL`: Health check frequency in seconds

### Configuration Files
- `config/default.json`: Default configuration
- Environment-specific overrides supported
- Hot-reload capable for development

## Security Considerations

### Input Validation
- All user inputs sanitized
- Type validation on API boundaries
- SQL injection prevention in storage layer
- XSS protection in HTML responses

### Authentication
- Framework provides auth hooks
- Implementations handle specific auth mechanisms
- Token validation and refresh logic
- Secure credential storage

## Performance Optimization

### Caching
- Built-in caching for expensive operations
- Configurable TTL and size limits
- Cache invalidation strategies
- Memory-efficient implementations

### Connection Pooling
- Database connection pooling
- HTTP client connection reuse
- Resource cleanup on shutdown
- Connection health monitoring

## Deployment

### Docker
```dockerfile
FROM node:20-alpine
COPY . /app
RUN npm ci --only=production
EXPOSE 3000
CMD ["npm", "start"]
```

### Production Checklist
- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Health checks passing
- [ ] Logging configured
- [ ] Monitoring alerts set up
- [ ] SSL certificates installed

## Troubleshooting

### Common Issues
1. **Connection timeouts**: Check network configuration and timeouts
2. **Database errors**: Verify connection strings and permissions
3. **Memory leaks**: Monitor heap usage and implement cleanup
4. **Performance degradation**: Check query optimization and caching

### Debug Mode
Enable debug logging:
```bash
LOG_LEVEL=debug npm start
```

### Health Checks
Access health endpoint:
```bash
curl http://localhost:3000/health
```

## Contributing

### Development Setup
```bash
npm install
npm run build
npm test
```

### Code Review Checklist
- [ ] TypeScript types correct
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] Security review passed
- [ ] Performance impact assessed

### Release Process
1. Version bump following semver
2. Changelog updated
3. Tests pass on CI
4. Security audit run
5. NPM publish with provenance

## Compatibility

See COMPATIBILITY.md for version support matrix and deprecation policy.