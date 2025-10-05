# 📘 MCP Server Best Practices Guide

This guide provides a baseline for **any new MCP server project**. It focuses on creating the best possible **information flow** between servers, clients, and AI agents.

---

## 🔹 Initialize Result (Handshake)

Every MCP server must respond to `initialize` with an `initialize_result` object.

### Required fields
- `protocolVersion` – MCP spec version (e.g., `"2024-11-05"`).
- `capabilities` – advertise supported APIs (resources, tools, logging, etc.).
- `serverInfo` – name, title, version.
- `instructions` – optional usage instructions.
- `meta` – optional metadata.

### Example
```json
{
  "initialize_result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "resources": { "subscribe": true, "listChanged": true },
      "tools": { "listChanged": true },
      "logging": null,
      "prompts": null,
      "completions": null,
      "experimental": null
    },
    "serverInfo": {
      "name": "mcp-yourserver",
      "title": "Your Server",
      "version": "0.1.0"
    },
    "instructions": "Use resources to fetch data, tools to act on it.",
    "meta": null
  }
}
```

---

## 🔹 Tools

Tools expose **functions** the server can execute. They must be **self-explanatory** to both humans and AI.

### Required information
- **Name** – short, machine-safe ID (`workflow_log_execution`).
- **Description** – must include:
  - Purpose (what problem it solves).
  - Parameters explained (especially required ones).
  - Scope/constraints (when/when not to use).
  - At least one **example call** with input/output JSON.
- **Input Schema** – JSON Schema with clear `description`, `required`, and constraints.
- **Output Schema** – JSON Schema with explicit result fields.

### Best practices
- Use **consistent naming** (`domain_action` style: `memory_store`, `workflow_log_execution`).
- Make tools **idempotent** where possible.
- Keep inputs minimal but expressive.
- Validate with enums, patterns, and ranges.
- Always document outputs with `status` or `result`.

### Example Tool
```json
{
  "name": "memory_store",
  "description": "Store information in memory. Example: { \"resource\": \"ci-pipeline\", \"task\": \"setup-vault\", \"type\": \"rule\", \"description\": \"Vault must pass CIS checks\" }",
  "inputSchema": { "type": "object", "properties": { "resource": { "type": "string" } }, "required": ["resource"] },
  "outputSchema": { "type": "object", "properties": { "id": { "type": "string" }, "status": { "type": "string" } }, "required": ["id","status"] }
}
```

---

## 🔹 Resources

Resources represent **static or dynamic data** that clients can fetch.

### Required information
- **URI** – unique and stable (`docs://agent-quick-start`).
- **Name** – human-friendly (`Agent Quick Start Guide`).
- **Description** – clear statement of purpose.
- **MIME type** – guides clients on handling (`text/markdown`, `application/json`).

### Best practices
- Use URI schemes to group (`docs://`, `memory://`, `config://`).
- Include sample payloads in descriptions when possible.
- Mark resources as `subscribe` if they support live updates.

### Example Resource
```json
{
  "uri": "docs://jsonrpc-examples",
  "name": "JSON-RPC Examples",
  "description": "Complete request/response examples for all MCP tools",
  "mimeType": "text/markdown"
}
```

---

## 🔹 Instructions & Metadata

- **Instructions**: Tell clients how to interact.
  - Order of tool usage.
  - Error handling guidance.
  - Context or security notes.

- **Meta**: Use for additional project metadata.
  - Authors, license, tags, compliance info.
  - Example:
    ```json
    "meta": {
      "author": "Platform Engineering",
      "tags": ["memory","logging","workflows"],
      "compliance": ["CIS","DORA"]
    }
    ```

---

## 🔹 Information Flow Principles

1. **Clarity** – every tool/resource should be understandable without external docs.  
2. **Self-documentation** – descriptions must include usage examples.  
3. **Consistency** – naming, schema style, and metadata must be uniform.  
4. **Versioning** – semantic versioning in `serverInfo.version`.  
5. **Safety** – tools should be idempotent and validate inputs strictly.  
6. **Discoverability** – resources and tools should be easy to enumerate (`listChanged` events).  

---

## ✅ Final Checklist for New Projects

- [ ] Does `initialize_result` include all required fields?  
- [ ] Do all tools have clear descriptions with **examples**?  
- [ ] Are input/output schemas strict and validated?  
- [ ] Are resources well-described with stable URIs?  
- [ ] Does `instructions` guide AI agents effectively?  
- [ ] Is `meta` used for authorship, compliance, or tags?  

---

📌 Use this guide as a **baseline for all new MCP projects** to ensure high-quality, self-explanatory, and AI-friendly information flow.
