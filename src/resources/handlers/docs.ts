import { Resource } from "../../types.js";
import { BaseResourceHandler, ResourceReadResult } from "../base.js";

/**
 * Documentation structure: key-value pairs where key is the document ID
 */
export interface DocsData {
  [docId: string]: string;
}

/**
 * Handler for documentation resources (resource://docs/*)
 *
 * Exposes documentation, guides, and help content as resources for AI agents
 * to understand how to use the server and its tools.
 */
export class DocsResourceHandler extends BaseResourceHandler {
  readonly type = "docs";
  readonly uriPrefix = "resource://docs/";

  constructor(private docs: DocsData) {
    super();
  }

  async list(): Promise<Resource[]> {
    return Object.keys(this.docs).map(docId => ({
      uri: `${this.uriPrefix}${docId}`,
      name: this.formatDocName(docId),
      description: `Documentation: ${this.formatDocName(docId)}`,
      mimeType: "text/markdown"
    }));
  }

  async read(uri: string): Promise<ResourceReadResult> {
    this.validateUri(uri);

    // Extract document ID from URI
    const docId = uri.substring(this.uriPrefix.length);

    if (this.docs[docId] !== undefined) {
      return this.createTextContent(
        uri,
        this.docs[docId],
        "text/markdown"
      );
    }

    const availableUris = Object.keys(this.docs).map(
      id => `${this.uriPrefix}${id}`
    );
    throw this.createNotFoundError(uri, availableUris);
  }

  /**
   * Format document ID into a human-readable name
   */
  private formatDocName(docId: string): string {
    return docId
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
