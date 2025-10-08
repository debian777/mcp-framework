import { Resource } from "../types.js";
import { ResourceHandler, ResourceReadResult } from "./base.js";

/**
 * Central registry for managing multiple resource handlers
 */
export class ResourceRegistry {
  private handlers: Map<string, ResourceHandler> = new Map();

  /**
   * Register a new resource handler
   */
  register(handler: ResourceHandler): void {
    if (this.handlers.has(handler.uriPrefix)) {
      throw new Error(
        `Handler with URI prefix "${handler.uriPrefix}" already registered`
      );
    }
    this.handlers.set(handler.uriPrefix, handler);
  }

  /**
   * List all available resources from all registered handlers
   */
  async list(): Promise<Resource[]> {
    const allResources: Resource[] = [];

    for (const handler of this.handlers.values()) {
      try {
        const resources = await handler.list();
        allResources.push(...resources);
      } catch (error) {
        // Silently skip handlers that fail - they can be debugged via handler.list() directly
        // This ensures the registry remains functional even if one handler has issues
      }
    }

    return allResources;
  }

  /**
   * Read a specific resource by URI
   */
  async read(uri: string): Promise<ResourceReadResult> {
    // Find the handler that can handle this URI
    for (const handler of this.handlers.values()) {
      if (handler.canHandle(uri)) {
        return await handler.read(uri);
      }
    }

    // No handler found
    throw new Error(
      `No handler found for URI: ${uri}\n` +
      `Registered prefixes: ${Array.from(this.handlers.keys()).join(", ")}`
    );
  }

  /**
   * Get a specific handler by its URI prefix
   */
  getHandler(uriPrefix: string): ResourceHandler | undefined {
    return this.handlers.get(uriPrefix);
  }

  /**
   * Get all registered handlers
   */
  getHandlers(): ResourceHandler[] {
    return Array.from(this.handlers.values());
  }

  /**
   * Get statistics about the registry
   */
  getStats(): {
    totalHandlers: number;
    totalResources: Promise<number>;
  } {
    return {
      totalHandlers: this.handlers.size,
      totalResources: this.list().then(resources => resources.length)
    };
  }
}
