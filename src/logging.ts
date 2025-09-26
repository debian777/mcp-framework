import fs, { createWriteStream } from "node:fs";
import path from "node:path";

export type LogLevel = "debug" | "info" | "warn" | "error" | "silent";

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 100,
};

function resolveLevel(raw?: string): LogLevel {
  if (!raw) return "info";
  const normalized = raw.toLowerCase();
  if (normalized === "debug" || normalized === "info" || normalized === "warn" || normalized === "error" || normalized === "silent") {
    return normalized as LogLevel;
  }
  return "info";
}

export interface LoggerOptions {
  name?: string;
  level?: LogLevel;
  defaultFields?: Record<string, unknown>;
  stream?: NodeJS.WritableStream;
  logFile?: string;
}

export type LogMeta = Record<string, unknown> | Error | undefined;

export interface Logger {
  debug(message: string, meta?: LogMeta): void;
  debug(meta: LogMeta, message?: string): void;
  info(message: string, meta?: LogMeta): void;
  info(meta: LogMeta, message?: string): void;
  warn(message: string, meta?: LogMeta): void;
  warn(meta: LogMeta, message?: string): void;
  error(message: string, meta?: LogMeta): void;
  error(meta: LogMeta, message?: string): void;
  child(bindings: Record<string, unknown>): Logger;
}

interface InternalLogger extends Logger {
  readonly level: LogLevel;
  readonly name?: string;
  readonly bindings: Record<string, unknown>;
  readonly stream?: NodeJS.WritableStream;
}

function normalizeArgs(arg1?: string | LogMeta, arg2?: string | LogMeta) {
  let message = "";
  let meta: LogMeta = undefined;

  if (typeof arg1 === "string") {
    message = arg1;
    if (arg2 && typeof arg2 === "object") {
      meta = arg2 as Record<string, unknown>;
    }
  } else {
    meta = arg1 as Record<string, unknown> | undefined;
    if (typeof arg2 === "string") {
      message = arg2;
    }
  }

  return { message, meta };
}

function createLoggerInstance(options: LoggerOptions = {}, bindings: Record<string, unknown> = {}): InternalLogger {
  const level = resolveLevel(options.level ?? process.env.LOG_LEVEL);

  // Determine if we're in stdio mode based on transport detection
  const isStdioMode = !process.env.MCP_HTTP_ENDPOINT?.trim();

  // Stream selection:
  // - If options.stream is explicitly set to null/undefined, disable console logging
  // - Otherwise default to stderr in stdio mode, stdout in HTTP/WS mode
  // - For MCP servers, set stream: null to disable console logging entirely
  const stream = 'stream' in options && (options.stream === null || options.stream === undefined)
    ? undefined
    : (isStdioMode ? process.stderr : process.stdout);

  // File logging support - always allow file logging regardless of console level
  const logFile = options.logFile ?? process.env.LOG_PATH ?? process.env.MCP_MEMORY_LOG_PATH;
  let fileStream: NodeJS.WritableStream | undefined;
  if (logFile) {
    try {
      const dir = path.dirname(logFile);
      if (dir && !fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    } catch (err) {
      // Non-fatal: if we can't create the directory, we'll still try to open the file and let createWriteStream emit if it fails
    }
    fileStream = createWriteStream(logFile, { flags: 'a' });
  }

  const name = options.name;
  const defaultFields = { ...(options.defaultFields ?? {}), ...bindings };

  function shouldLog(target: LogLevel) {
    if (level === "silent") {
      return false;
    }
    if (target === "silent") {
      return false;
    }
    return LEVEL_WEIGHT[target] >= LEVEL_WEIGHT[level];
  }

  function shouldLogToFile(target: LogLevel) {
    // File logging uses a separate level - default to "info" if not specified
    const fileLevel = resolveLevel(process.env.LOG_LEVEL ?? "info");
    if (fileLevel === "silent") {
      return false;
    }
    if (target === "silent") {
      return false;
    }
    return LEVEL_WEIGHT[target] >= LEVEL_WEIGHT[fileLevel];
  }

  function write(target: LogLevel, args: { message: string; meta?: LogMeta }) {
    const entry: Record<string, unknown> = {
      level: target,
      time: new Date().toISOString(),
      ...defaultFields,
    };

    if (name) entry.name = name;
    if (args.message) entry.msg = args.message;
    if (args.meta) {
      if (args.meta instanceof Error) {
        entry.error = args.meta.message;
        if (args.meta.stack) {
          entry.stack = args.meta.stack;
        }
      } else {
        Object.assign(entry, args.meta);
      }
    }

    const logLine = JSON.stringify(entry) + "\n";

    // Write to console if logging is enabled and stream is available
    if (shouldLog(target) && stream) {
      stream.write(logLine);
    }

    // Always write to file if file logging is enabled and level allows
    if (fileStream && shouldLogToFile(target)) {
      fileStream.write(logLine);
    }
  }

  const logger: InternalLogger = {
    level,
    name,
    bindings: defaultFields,
    stream,
    debug(arg1?: string | LogMeta, arg2?: string | LogMeta) {
      const args = normalizeArgs(arg1, arg2);
      write("debug", args);
    },
    info(arg1?: string | LogMeta, arg2?: string | LogMeta) {
      const args = normalizeArgs(arg1, arg2);
      write("info", args);
    },
    warn(arg1?: string | LogMeta, arg2?: string | LogMeta) {
      const args = normalizeArgs(arg1, arg2);
      write("warn", args);
    },
    error(arg1?: string | LogMeta, arg2?: string | LogMeta) {
      const args = normalizeArgs(arg1, arg2);
      write("error", args);
    },
    child(childBindings: Record<string, unknown>) {
      return createLoggerInstance(
        { ...options, defaultFields: { ...defaultFields, ...childBindings } },
        {}
      );
    },
  };

  return logger;
}

export function createLogger(options: LoggerOptions | string = {}): Logger {
  if (typeof options === "string") {
    return createLoggerInstance({ level: resolveLevel(options) });
  }
  return createLoggerInstance(options);
}
