import { Resource, Tool } from "../../types.js";
import { BaseResourceHandler, ResourceReadResult } from "../base.js";

/**
 * Interface for tool providers that can expose their tools as resources
 */
export interface ToolProvider {
  getTools(): Tool[];
}

/**
 * Handler for tool definition resources (resource://tool/*)
 *
 * Exposes tool definitions and schemas as resources, allowing AI agents
 * to discover and understand available tools at runtime.
 */
export class ToolResourceHandler extends BaseResourceHandler {
  readonly type = "tool";
  readonly uriPrefix = "resource://tool/";

  constructor(private toolProvider: ToolProvider) {
    super();
  }

  async list(): Promise<Resource[]> {
    const tools = this.toolProvider.getTools();

    return [
      // List of all tools
      {
        uri: `${this.uriPrefix}list`,
        name: "Tool Definitions",
        description: "Complete list of available tool definitions and schemas",
        mimeType: "application/json"
      },
      // Individual tool definitions
      ...tools.map(tool => ({
        uri: `${this.uriPrefix}${tool.name}`,
        name: `Tool: ${tool.name}`,
        description: tool.description,
        mimeType: "application/json"
      }))
    ];
  }

  async read(uri: string): Promise<ResourceReadResult> {
    this.validateUri(uri);

    const tools = this.toolProvider.getTools();

    // Return all tools
    if (uri === `${this.uriPrefix}list`) {
      return this.createJsonContent(uri, {
        tools,
        count: tools.length
      });
    }

    // Return specific tool
    const toolName = uri.substring(this.uriPrefix.length);
    const tool = tools.find(t => t.name === toolName);

    if (tool) {
      return this.createJsonContent(uri, tool);
    }

    const availableUris = [
      `${this.uriPrefix}list`,
      ...tools.map(t => `${this.uriPrefix}${t.name}`)
    ];
    throw this.createNotFoundError(uri, availableUris);
  }
}
