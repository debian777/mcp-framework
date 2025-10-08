import { Resource } from "../../types.js";
import { BaseResourceHandler, ResourceReadResult } from "../base.js";

/**
 * Configuration data structure
 */
export interface ConfigData {
  [key: string]: any;
}

/**
 * Handler for configuration resources (resource://config/*)
 *
 * Exposes server configuration as resources for AI agents to discover and understand
 * the server's capabilities and settings.
 */
export class ConfigResourceHandler extends BaseResourceHandler {
  readonly type = "config";
  readonly uriPrefix = "resource://config/";

  constructor(private config: ConfigData) {
    super();
  }

  async list(): Promise<Resource[]> {
    return [
      {
        uri: `${this.uriPrefix}server`,
        name: "Server Configuration",
        description: "Current server configuration and settings",
        mimeType: "application/json"
      }
    ];
  }

  async read(uri: string): Promise<ResourceReadResult> {
    this.validateUri(uri);

    if (uri === `${this.uriPrefix}server`) {
      return this.createJsonContent(uri, this.config);
    }

    throw this.createNotFoundError(uri, [`${this.uriPrefix}server`]);
  }
}
