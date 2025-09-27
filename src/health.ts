import type { RpcHandlers } from "./server.js";
export function registerHealth(handlers: RpcHandlers) {
  handlers["ping"] = async () => ({ ok: true });
  handlers["version"] = async () => ({ version: "0.1.0" });
}
