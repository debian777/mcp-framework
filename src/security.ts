const DEFAULT_MAX_INPUT_BYTES = parseInt(process.env.MCP_INPUT_MAX_BYTES || "1048576", 10);

export const DEFAULT_MAX_INPUT_SIZE = Number.isFinite(DEFAULT_MAX_INPUT_BYTES) ? DEFAULT_MAX_INPUT_BYTES : 1048576;

export function sanitizeForLogging(input: string): string {
  if (typeof input !== "string") {
    return String(input);
  }

  return input
    .replace(/\t/g, " ")
    .replace(/[\r\n]/g, " ")
    .replace(/\x00/g, "")
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, " ")
    .replace(/ +/g, " ")
    .trim();
}

export function validateInputSize(value: string | Buffer, maxSize: number = DEFAULT_MAX_INPUT_SIZE): boolean {
  if (value instanceof Buffer || Buffer.isBuffer?.(value)) {
    return value.length <= maxSize;
  }

  if (typeof value === "string") {
    return Buffer.byteLength(value, "utf8") <= maxSize;
  }

  return true;
}

export function sanitizeForDatabase(input: string): string {
  if (typeof input !== "string") {
    return String(input);
  }

  return input
    .replace(/[\'";\\]/g, "")
    .replace(/--/g, "")
    .replace(/\/\*.*?\*\//g, "")
    .trim();
}

export function sanitizeFilePath(input: string): string {
  if (typeof input !== "string") {
    return "";
  }

  return input
    .replace(/\.\./g, "")
    .replace(/[<>:"|?*]/g, "")
    .replace(/^\//, "")
    .replace(/\/$/, "")
    .trim();
}

export function validateContentType(contentType: string): boolean {
  const allowedTypes = [
    "application/json",
    "text/plain",
    "text/markdown",
    "application/octet-stream",
  ];

  return allowedTypes.some((type) => contentType?.startsWith(type));
}

export function sanitizeJsonInput(input: string): { valid: boolean; data?: any; error?: string } {
  try {
    if (!validateInputSize(input)) {
      return { valid: false, error: "Input exceeds maximum size limit" };
    }

    const data = JSON.parse(input);
    if (data && typeof data === "object") {
      const hasPrototypeKeys = Object.prototype.hasOwnProperty.call(data, "__proto__") ||
        Object.prototype.hasOwnProperty.call(data, "constructor") ||
        Object.prototype.hasOwnProperty.call(data, "prototype");

      if (hasPrototypeKeys) {
        return { valid: false, error: "Invalid JSON structure" };
      }
    }

    return { valid: true, data };
  } catch (error: any) {
    return { valid: false, error: error?.message ?? "Invalid JSON" };
  }
}

export function safeJsonParse(input: string) {
  return sanitizeJsonInput(input);
}

export function validateToolParameters(params: any, maxParamSize: number = DEFAULT_MAX_INPUT_SIZE / 10) {
  if (!params || typeof params !== "object") {
    return { success: false, error: "Parameters must be an object" };
  }

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") {
      if (value.includes("../") || value.includes("..\\")) {
        return { success: false, error: `Parameter ${key} contains directory traversal` };
      }

      if (!validateInputSize(value, maxParamSize)) {
        return { success: false, error: `Parameter ${key} exceeds size limit` };
      }
    }
  }

  return { success: true, sanitized: params };
}

export class SimpleRateLimiter {
  private readonly requests = new Map<string, number[]>();

  constructor(private readonly windowMs: number = 60000, private readonly maxRequests: number = 100) {}

  isAllowed(key: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const existing = this.requests.get(key) || [];
    const valid = existing.filter((time) => time > windowStart);

    if (valid.length >= this.maxRequests) {
      return false;
    }

    valid.push(now);
    this.requests.set(key, valid);
    return true;
  }
}
