import { stdin, stdout, stderr } from "node:process";
import { Buffer } from "node:buffer";
import { z } from "zod";

export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: number | string | null;
  method: string;
  params?: unknown;
}

export interface JsonRpcNotification {
  jsonrpc: "2.0";
  method: string;
  params?: unknown;
  // Note: no 'id' field for notifications
}

export interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: number | string | null;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export type NotificationHandler = (
  notification: JsonRpcNotification,
  context: { method: string; startTime: number }
) => Promise<void>;

export interface RequestContext {
  requestId: number | string | null;
  method: string;
  startTime: number;
}

export type RequestHandler = (
  request: JsonRpcRequest,
  context: RequestContext
) => Promise<JsonRpcResponse>;

export interface TransportConfig {
  framing?: "content-length" | "newline" | "auto";
  maxConcurrency?: number;
  maxMessageSize?: number;
  maxHeaderSize?: number;
}

export interface TransportLogger {
  debug?: (msg: string, meta?: Record<string, unknown>) => void;
  info?: (msg: string, meta?: Record<string, unknown>) => void;
  warn?: (msg: string, meta?: Record<string, unknown>) => void;
  error?: (msg: string, meta?: Record<string, unknown>) => void;
}

// Zod schema for JSON-RPC message validation (permissive)
const jsonRpcMessageSchema = z.object({
  jsonrpc: z.literal("2.0").optional(), // Allow missing for compatibility
  method: z.string().optional(), // Allow missing for responses
  params: z.unknown().optional(),
  id: z.union([z.string(), z.number(), z.null()]).optional(), // Allow missing for notifications
  result: z.unknown().optional(),
  error: z.object({
    code: z.number(),
    message: z.string(),
    data: z.unknown().optional(),
  }).optional(),
}).refine((data) => {
  // At least one of method, result, or error must be present
  return data.method !== undefined || data.result !== undefined || data.error !== undefined;
}, {
  message: "JSON-RPC message must have method, result, or error",
});

const DEFAULT_CONFIG: Required<TransportConfig> = {
  framing: "auto",
  maxConcurrency: 16,
  maxMessageSize: 10 * 1024 * 1024, // 10MB to handle MCP Inspector messages with large env vars
  maxHeaderSize: 4096,
};

const JSON_RPC_ERROR = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  PAYLOAD_TOO_LARGE: -32001,
} as const;

class AsyncSemaphore {
  private readonly queue: Array<() => void> = [];
  private readonly limit: number;
  private active = 0;

  constructor(limit: number) {
    this.limit = Math.max(1, limit);
  }

  async acquire(): Promise<() => void> {
    if (this.active < this.limit) {
      this.active += 1;
      return () => this.release();
    }

    return new Promise((resolve) => {
      const grant = () => {
        this.active += 1;
        resolve(() => this.release());
      };
      this.queue.push(grant);
    });
  }

  private release() {
    this.active = Math.max(0, this.active - 1);
    const next = this.queue.shift();
    if (next) {
      next();
    }
  }
}

function defaultLogger(): TransportLogger {
  return {
    debug: () => { },
    info: () => { },
    warn: (msg, meta) => stderr.write(`${msg}${meta ? ` ${JSON.stringify(meta)}` : ""}\n`),
    error: (msg, meta) => stderr.write(`${msg}${meta ? ` ${JSON.stringify(meta)}` : ""}\n`),
  };
}

function validateInputSize(value: string, maxBytes: number) {
  return Buffer.byteLength(value, "utf8") <= maxBytes;
}

function safeJsonParse(raw: string): { valid: boolean; data?: JsonRpcRequest | JsonRpcRequest[]; error?: string } {
  try {
    const data = JSON.parse(raw);
    if (typeof data !== "object" || data === null) {
      return { valid: false, error: "Invalid JSON structure" };
    }
    return { valid: true, data };
  } catch (error: any) {
    return { valid: false, error: error?.message ?? "Invalid JSON" };
  }
}

export class StdioTransport {
  private readonly requestHandler: RequestHandler;
  private readonly notificationHandler?: NotificationHandler;
  private readonly logger: TransportLogger;
  private readonly config: Required<TransportConfig>;
  private readonly semaphore: AsyncSemaphore;

  private buffer = "";
  private isRunning = false;
  private currentFraming: "content-length" | "newline" = "content-length";
  private framingResolved = false;

  constructor(
    requestHandler: RequestHandler,
    options: {
      config?: TransportConfig;
      logger?: TransportLogger;
      notificationHandler?: NotificationHandler;
    } = {}
  ) {
    this.requestHandler = requestHandler;
    this.notificationHandler = options.notificationHandler;
    this.config = { ...DEFAULT_CONFIG, ...(options.config ?? {}) };
    this.logger = options.logger ?? defaultLogger();
    this.semaphore = new AsyncSemaphore(this.config.maxConcurrency);
    if (this.config.framing === "newline") {
      this.currentFraming = "newline";
      this.framingResolved = true;
    }
  }

  async start() {
    if (this.isRunning) {
      throw new Error("Transport already running");
    }

    this.isRunning = true;
    stdin.setEncoding("utf8");

    const onData = (chunk: string | Buffer) => {
      try {
        this.buffer += typeof chunk === "string" ? chunk : chunk.toString("utf8");
        this.processBuffer();
      } catch (error: any) {
        this.logger.error?.("Transport data processing error", { error: error?.message });
        this.sendError(null, JSON_RPC_ERROR.INTERNAL_ERROR, "Transport error");
      }
    };

    const onEnd = () => {
      this.stop();
    };

    const onError = (error: Error) => {
      this.logger.error?.("Transport stdin error", { error: error.message });
      this.stop();
    };

    stdin.on("data", onData);
    stdin.on("end", onEnd);
    stdin.on("error", onError);
  }

  stop() {
    if (!this.isRunning) return;
    stdin.removeAllListeners("data");
    stdin.removeAllListeners("end");
    stdin.removeAllListeners("error");
    this.isRunning = false;
    this.buffer = "";
    this.framingResolved = this.config.framing !== "auto";
    if (this.config.framing !== "newline") {
      this.currentFraming = "content-length";
    }
  }

  private processBuffer() {
    if (!this.framingResolved && this.config.framing === "auto") {
      const trimmed = this.buffer.trimStart();
      if (trimmed.startsWith("Content-Length:")) {
        this.currentFraming = "content-length";
        this.framingResolved = true;
      } else if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        this.currentFraming = "newline";
        this.framingResolved = true;
      } else {
        return;
      }
    }

    if (this.currentFraming === "content-length") {
      this.processContentLengthFraming();
    } else {
      this.processNewlineFraming();
    }
  }

  private processContentLengthFraming() {
    while (this.buffer.length > 0) {
      const headerSeparator = this.buffer.indexOf("\r\n\r\n");
      if (headerSeparator === -1) {
        if (this.buffer.length > this.config.maxHeaderSize) {
          this.sendError(null, JSON_RPC_ERROR.PAYLOAD_TOO_LARGE, "Header too large");
          this.buffer = "";
        }
        break;
      }

      const header = this.buffer.slice(0, headerSeparator);
      const match = /Content-Length:\s*(\d+)/i.exec(header);
      if (!match) {
        this.sendError(null, JSON_RPC_ERROR.PARSE_ERROR, "Missing Content-Length header");
        this.buffer = this.buffer.slice(headerSeparator + 4);
        continue;
      }

      const contentLength = Number.parseInt(match[1], 10);
      if (!Number.isFinite(contentLength) || contentLength < 0 || contentLength > this.config.maxMessageSize) {
        this.sendError(null, JSON_RPC_ERROR.PAYLOAD_TOO_LARGE, "Invalid Content-Length");
        this.buffer = this.buffer.slice(headerSeparator + 4);
        continue;
      }

      const messageStart = headerSeparator + 4;
      const messageEnd = messageStart + contentLength;
      if (this.buffer.length < messageEnd) {
        break;
      }

      const payload = this.buffer.slice(messageStart, messageEnd);
      this.buffer = this.buffer.slice(messageEnd);
      this.handleMessage(payload);
    }
  }

  private processNewlineFraming() {
    const lines = this.buffer.split("\n");
    this.buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (!validateInputSize(trimmed, this.config.maxMessageSize)) {
        this.logger.error?.("Message size validation failed", {
          messageSize: Buffer.byteLength(trimmed, "utf8"),
          maxSize: this.config.maxMessageSize,
          messagePreview: trimmed.substring(0, 100) + "..."
        });
        this.sendError(null, JSON_RPC_ERROR.PAYLOAD_TOO_LARGE, "Message too large");
        continue;
      }
      this.handleMessage(trimmed);
    }
  }

  private async handleMessage(raw: string) {
    const parsed = safeJsonParse(raw);
    if (!parsed.valid) {
      this.sendError(null, JSON_RPC_ERROR.PARSE_ERROR, parsed.error ?? "Invalid JSON");
      return;
    }

    const payload = parsed.data as JsonRpcRequest | JsonRpcNotification | (JsonRpcRequest | JsonRpcNotification)[];
    const messages = Array.isArray(payload) ? payload : [payload];

    for (const message of messages) {
      // Check if this is a notification (no id field) or request (has id field)
      if (this.isNotification(message)) {
        await this.handleNotification(message as JsonRpcNotification);
      } else if (this.isValidRequest(message as JsonRpcRequest)) {
        const request = message as JsonRpcRequest;
        const release = await this.semaphore.acquire();
        const context: RequestContext = {
          requestId: request.id,
          method: request.method,
          startTime: Date.now(),
        };

        this.processRequest(request, context, release);
      } else {
        // Invalid message
        const request = message as JsonRpcRequest;
        // Log full request details when in debug mode
        this.logger?.debug?.("Invalid JSON-RPC message", {
          message,
          rawMessagePreview: raw.substring(0, 200) + (raw.length > 200 ? "..." : ""),
          framing: this.currentFraming,
          framingResolved: this.framingResolved,
          bufferLength: this.buffer.length
        });
        // Log structured error details
        this.logger?.error?.("Invalid JSON-RPC message", {
          message,
          rawMessagePreview: raw.substring(0, 200) + (raw.length > 200 ? "..." : ""),
          framing: this.currentFraming,
          framingResolved: this.framingResolved,
          bufferLength: this.buffer.length,
          code: JSON_RPC_ERROR.INVALID_REQUEST,
          id: (message as any)?.id ?? null
        });
        this.sendError((message as any)?.id ?? null, JSON_RPC_ERROR.INVALID_REQUEST, "Invalid JSON-RPC message");
        continue;
      }
    }
  }

  private async processRequest(
    request: JsonRpcRequest,
    context: RequestContext,
    release: () => void
  ) {
    try {
      const response = await this.requestHandler(request, context);
      this.writeResponse(response);
    } catch (error: any) {
      this.logger.error?.("Handler error", { method: request.method, error: error?.message });
      this.sendError(request.id, JSON_RPC_ERROR.INTERNAL_ERROR, error?.message ?? "Internal error");
    } finally {
      release();
    }
  }

  private writeResponse(response: JsonRpcResponse) {
    try {
      const payload = JSON.stringify(response);

      if (this.currentFraming === "newline") {
        stdout.write(`${payload}\n`);
      } else {
        const framed = `Content-Length: ${Buffer.byteLength(payload, "utf8")}\r\n\r\n${payload}`;
        stdout.write(framed);
      }
    } catch (error: any) {
      this.logger.error?.("Failed to write response", { error: error?.message });
    }
  }

  private sendError(id: number | string | null, code: number, message: string) {
    // For transport-level errors with null id, we can't send a proper response
    // Log the error instead and don't send anything to avoid protocol corruption
    this.logger.error?.(`Transport error: ${message}`, { code, id });

    // Only send error response if we have a valid id
    if (id !== null) {
      const response: JsonRpcResponse = {
        jsonrpc: "2.0",
        id,
        error: { code, message },
      };
      this.writeResponse(response);
    }
  }

  private isNotification(message: any): message is JsonRpcNotification {
    return (
      message &&
      message.jsonrpc === "2.0" &&
      typeof message.method === "string" &&
      message.method.length > 0 &&
      (message.id === undefined || message.id === null) // Notifications have no id field
    );
  }

  private async handleNotification(notification: JsonRpcNotification) {
    try {
      // Log the notification
      if (notification.method === "notifications/initialized") {
        this.logger.warn?.("⚠️ Legacy initialized notification accepted", { params: notification.params });
      } else {
        this.logger.info?.("Notification received", { method: notification.method, params: notification.params });
      }

      // Call the notification handler if provided
      if (this.notificationHandler) {
        const context = {
          method: notification.method,
          startTime: Date.now(),
        };
        await this.notificationHandler(notification, context);
      }

      // Notifications never receive responses per JSON-RPC spec
    } catch (error: any) {
      this.logger.error?.("Notification handler error", {
        method: notification.method,
        error: error?.message
      });
      // Still don't send a response for notifications, even on error
    }
  }

  private isValidRequest(request: JsonRpcRequest) {
    return (
      request &&
      request.jsonrpc === "2.0" &&
      typeof request.method === "string" &&
      request.method.length > 0 &&
      (typeof request.id === "number" || typeof request.id === "string" || request.id === null)
    );
  }
}

