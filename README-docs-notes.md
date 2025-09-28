# Documentation Development Notes

This document provides information for developers working on the mcp-framework documentation.

## NPM Scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "docs:api": "typedoc",
    "docs:serve": "mkdocs serve",
    "docs:build": "mkdocs build",
    "docs:deploy": "mkdocs gh-deploy"
  }
}
```

### API Documentation

Generate TypeScript API documentation:

```bash
npm run docs:api
```

This creates HTML documentation in `docs/api/` using TypeDoc configuration from `typedoc.json`.

### Local Preview

Serve documentation locally for development:

```bash
npm run docs:serve
```

This starts a local development server at `http://localhost:8000` with hot reload.

### Build Documentation

Build static site for production:

```bash
npm run docs:build
```

This generates the complete site in the `site/` directory.

### Deploy Documentation

Deploy to GitHub Pages:

```bash
npm run docs:deploy
```

This builds and deploys the documentation to the `gh-pages` branch.

## Documentation Structure

```
docs/
├── index.md                    # Overview/Home page
├── getting-started.md          # Quick start guide
├── core-concepts.md            # Architecture and concepts
├── ai-instructions.md          # AI coding guidelines
├── guides/                     # Detailed guides
│   ├── tools.md               # Tool development
│   ├── resources.md           # Resource development
│   ├── prompts.md             # Prompt development
│   ├── errors-logging.md      # Error handling & logging
│   ├── transports.md          # Transport configuration
│   ├── testing.md             # Testing strategies
│   └── deployment.md          # Production deployment
├── examples/                   # Complete examples
│   ├── hello-world.md         # Basic example
│   ├── filesystem.md          # File system provider
│   └── api-bridge.md          # API integration
├── reference/                  # Technical reference
│   ├── configuration.md       # Configuration options
│   └── error-codes.md         # Error code reference
├── api/                       # Generated API docs (TypeDoc)
├── development/               # Development docs
│   ├── contributing.md        # Contribution guidelines
│   ├── framework-development-plan.md
│   └── ai-improvement-starter.md
└── adr/                       # Architecture decision records
    └── 000-template.md        # ADR template
```

## Writing Guidelines

### Markdown Standards

- Use `#` for headings (not `===` underlines)
- Use code blocks with language hints: ````typescript`
- Use relative links for internal documentation
- Include table of contents for long documents
- Use admonitions for important notes:

```markdown
!!! note
    This is a note

!!! warning
    This is a warning

!!! tip
    This is a tip
```

### Code Examples

- Include runnable code examples
- Use TypeScript for all code samples
- Test examples to ensure they work
- Include imports and setup code
- Add comments explaining complex parts

### Cross-References

- Link to related documentation sections
- Reference API documentation when relevant
- Use consistent terminology throughout

## MkDocs Configuration

The `mkdocs.yml` file configures the documentation site:

- **Theme**: Material Design theme with navigation
- **Navigation**: Organized by user journey (Overview → Getting Started → Core Concepts → Guides → Examples → Reference)
- **Extensions**: Code highlighting, tabs, admonitions, footnotes
- **Plugins**: Search functionality

### Navigation Structure

```yaml
nav:
  - Overview: index.md
  - Getting Started: getting-started.md
  - Core Concepts: core-concepts.md
  - Guides: guides/
  - Examples: examples/
  - Reference: reference/
  - AI Instructions: ai-instructions.md
```

## TypeDoc Configuration

The `typedoc.json` file configures API documentation generation:

- **Entry Point**: `src/index.ts` (main export)
- **Output**: `docs/api/` directory
- **Exclusions**: Private members, test files
- **Features**: Source links, categorization, search

### API Documentation Categories

- **Providers**: ToolProvider, ResourceProvider, PromptProvider
- **Server**: FrameworkServer, FrameworkBuilder
- **Transport**: Transport implementations
- **Storage**: Storage interfaces and backends
- **Configuration**: Configuration types and utilities
- **Utilities**: Helper functions and utilities

## GitHub Actions Workflow

The `.github/workflows/docs.yml` automates documentation deployment:

- **Triggers**: Push/PR to main branch affecting docs or source
- **Steps**:
  1. Checkout repository
  2. Setup Node.js and install dependencies
  3. Build TypeScript
  4. Generate API docs with TypeDoc
  5. Setup Python and install MkDocs
  6. Build MkDocs site
  7. Deploy to GitHub Pages (push to main only)

### Deployment

Documentation is deployed to `https://debian777.github.io/mcp-framework/` on the `gh-pages` branch.

## Local Development

### Prerequisites

- Node.js 20+
- Python 3.x
- MkDocs: `pip install mkdocs mkdocs-material`
- TypeDoc: `npm install -g typedoc` (optional, can use npx)

### Development Workflow

1. **Make changes** to documentation files
2. **Preview locally**: `npm run docs:serve`
3. **Check API docs**: `npm run docs:api` then view in browser
4. **Build and test**: `npm run docs:build`
5. **Commit changes** with descriptive message

### Testing Documentation

- Check all links work
- Verify code examples compile
- Test navigation structure
- Validate MkDocs build succeeds
- Check mobile responsiveness

## Contributing

### Documentation Standards

- Follow the [AI Instructions](ai-instructions.md) for consistent style
- Use inclusive and accessible language
- Keep examples simple but complete
- Update documentation with code changes
- Test documentation builds before committing

### Review Process

- Documentation changes require review
- Check for broken links and formatting
- Verify examples work as documented
- Ensure consistency with existing docs
- Test on multiple devices/browsers

## Troubleshooting

### Common Issues

**MkDocs build fails**
- Check YAML syntax in `mkdocs.yml`
- Verify all referenced files exist
- Check for invalid Markdown syntax

**TypeDoc generation fails**
- Ensure TypeScript compiles successfully
- Check `typedoc.json` configuration
- Verify entry point exports exist

**GitHub Pages deployment fails**
- Check repository settings for Pages
- Verify `gh-pages` branch exists
- Check workflow permissions

**Links not working**
- Use relative paths for internal links
- Check file names and extensions
- Verify MkDocs navigation structure

### Getting Help

- Check existing documentation for similar issues
- Review MkDocs and TypeDoc documentation
- Ask in GitHub Discussions
- Check GitHub Issues for known problems