import { URL } from "node:url";

export type DetectedTransport = "stdio" | "http" | "websocket" | "custom";

export interface TransportConfig {
  framing: "content-length" | "newline" | "auto";
  transport?: DetectedTransport;
  endpoint?: string;
  headers?: Record<string, string>;
  timeout?: number;
}

function parseHeaders(value?: string): Record<string, string> | undefined {
  if (!value) return undefined;
  const pairs = value.split(/[;,]/).map((segment) => segment.trim()).filter(Boolean);
  if (pairs.length === 0) return undefined;

  const headers: Record<string, string> = {};
  for (const pair of pairs) {
    const [key, ...rest] = pair.split("=");
    if (!key || rest.length === 0) continue;
    headers[key.trim()] = rest.join("=").trim();
  }
  return Object.keys(headers).length > 0 ? headers : undefined;
}

export function detectTransportFraming(): TransportConfig {
  const framingValue = process.env.MCP_TRANSPORT_FRAMING?.trim().toLowerCase();

  if (framingValue) {
    switch (framingValue) {
      case "stdio":
      case "json-rpc":
        return { framing: "auto", transport: "stdio" };
      case "http":
      case "https": {
        const endpoint = process.env.MCP_HTTP_ENDPOINT || "http://localhost:3000";
        validateHttpEndpoint(endpoint);
        return {
          framing: "auto",
          transport: "http",
          endpoint,
          headers: parseHeaders(process.env.MCP_HTTP_HEADERS),
        };
      }
      case "websocket":
      case "ws": {
        const endpoint = process.env.MCP_WS_ENDPOINT || "ws://localhost:3001";
        validateWebSocketEndpoint(endpoint);
        return { framing: "auto", transport: "websocket", endpoint };
      }
      case "newline":
        return { framing: "newline", transport: "stdio" };
      case "content-length":
        return { framing: "content-length", transport: "stdio" };
      default:
        return autoDetectTransport();
    }
  }

  return autoDetectTransport();
}

function autoDetectTransport(): TransportConfig {
  const endpoint = process.env.MCP_HTTP_ENDPOINT?.trim();

  if (endpoint) {
    validateHttpEndpoint(endpoint);
    return {
      framing: "auto",
      transport: "http",
      endpoint,
      headers: parseHeaders(process.env.MCP_HTTP_HEADERS),
    };
  }

  return { framing: "auto", transport: "stdio" };
}

function validateHttpEndpoint(endpoint: string): void {
  try {
    const url = new URL(endpoint);
    if (!url.protocol.startsWith("http")) {
      throw new Error("HTTP endpoint must use http or https scheme");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid HTTP endpoint URL: ${endpoint} (${message})`);
  }
}

function validateWebSocketEndpoint(endpoint: string): void {
  try {
    const url = new URL(endpoint);
    if (!url.protocol.startsWith("ws")) {
      throw new Error("WebSocket endpoint must use ws or wss scheme");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid WebSocket endpoint URL: ${endpoint} (${message})`);
  }
}
