import { readFileSync, existsSync } from "node:fs";

export interface LoadedConfig<T> {
  data?: T;
  error?: Error;
  exists: boolean;
}

export function loadJsonConfig<T = unknown>(path: string): LoadedConfig<T> {
  if (!path) {
    return { exists: false };
  }

  const exists = existsSync(path);
  if (!exists) {
    return { exists: false };
  }

  try {
    const raw = readFileSync(path, "utf8");
    const data = JSON.parse(raw) as T;
    return { exists: true, data };
  } catch (error: any) {
    const err = error instanceof Error ? error : new Error(String(error));
    return { exists: true, error: err };
  }
}

export function parseEnvBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined) return undefined;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "n", "off"].includes(normalized)) return false;
  return undefined;
}

export function parseEnvNumber(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function parseEnvList(value: string | undefined, delimiter = ","): string[] | undefined {
  if (!value) return undefined;
  const items = value
    .split(delimiter)
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length > 0 ? items : undefined;
}
