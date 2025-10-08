import { Resource } from "../types.js";

/**
 * Result of reading a resource
 */
export interface ResourceContent {
  uri: string;
  mimeType?: string;
  text?: string;
  blob?: string;
}

export interface ResourceReadResult {
  contents: ResourceContent[];
}

/**
 * Base interface for resource handlers
 */
export interface ResourceHandler {
  readonly type: string;
  readonly uriPrefix: string;

  canHandle(uri: string): boolean;
  list(): Promise<Resource[]>;
  read(uri: string): Promise<ResourceReadResult>;
}

/**
 * Abstract base class for resource handlers providing common functionality
 */
export abstract class BaseResourceHandler implements ResourceHandler {
  abstract readonly type: string;
  abstract readonly uriPrefix: string;

  /**
   * Check if this handler can handle the given URI
   */
  canHandle(uri: string): boolean {
    return uri.startsWith(this.uriPrefix);
  }

  /**
   * List all resources this handler provides
   */
  abstract list(): Promise<Resource[]>;

  /**
   * Read a specific resource by URI
   */
  abstract read(uri: string): Promise<ResourceReadResult>;

  /**
   * Validate that the URI is supported by this handler
   * @throws Error if URI is invalid
   */
  protected validateUri(uri: string): void {
    if (!this.canHandle(uri)) {
      throw new Error(
        `Invalid URI for ${this.type} handler. ` +
        `Expected prefix: ${this.uriPrefix}, got: ${uri}`
      );
    }
  }

  /**
   * Create a standardized "not found" error
   */
  protected createNotFoundError(uri: string, availableUris: string[]): Error {
    return new Error(
      `Resource not found: ${uri}\n` +
      `Available ${this.type} resources:\n` +
      availableUris.map(u => `  - ${u}`).join('\n')
    );
  }

  /**
   * Create a standardized resource content response
   */
  protected createTextContent(
    uri: string,
    text: string,
    mimeType: string = "text/plain"
  ): ResourceReadResult {
    return {
      contents: [
        {
          uri,
          mimeType,
          text
        }
      ]
    };
  }

  /**
   * Create a standardized resource content response for JSON
   */
  protected createJsonContent(
    uri: string,
    data: any
  ): ResourceReadResult {
    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(data, null, 2)
        }
      ]
    };
  }
}
