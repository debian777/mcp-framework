import { createInterface } from "node:readline/promises";
import { stdin, stdout, stderr } from "node:process";

export type RpcHandlers = Record<string, (params?: any) => Promise<any>>;

export async function startJsonRpcServer(handlers: RpcHandlers) {
  const rl = createInterface({ input: stdin, crlfDelay: Infinity });

  async function write(msg: unknown) {
    stdout.write(JSON.stringify(msg) + "\n");
  }

  for await (const line of rl) {
    let req: any;
    try { req = JSON.parse(line); }
    catch {
      await write({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } });
      continue;
    }

    const { id, method, params } = req ?? {};
    const fn = handlers?.[method as keyof typeof handlers];
    if (!fn) {
      await write({ jsonrpc: "2.0", id, error: { code: -32601, message: "Method not found" } });
      continue;
    }

    try {
      const result = await fn(params);
      await write({ jsonrpc: "2.0", id, result });
    } catch (e: any) {
      const message = e?.message ?? String(e);
      await write({ jsonrpc: "2.0", id, error: { code: -32000, message } });
      stderr.write(`handler error: ${message}\n`);
    }
  }
}
