import { spawn } from 'child_process';
import { once } from 'events';
import { strict as assert } from 'assert';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, it, before, after } from 'node:test';
import { detectTransportFraming } from '../transport/framing.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('MCP Client/Server Integration (stdio transport)', () => {
    let serverProc: any;
    let stdoutData = '';

    before(async () => {
        // Start MCP server as a child process using stdio transport
        const serverPath = path.resolve(__dirname, '../test-server.js');
        serverProc = spawn('node', [serverPath], {
            stdio: ['pipe', 'pipe', 'pipe']
        });
        // Wait for server to be ready (could add a handshake or delay if needed)
        await new Promise(res => setTimeout(res, 500));
    }); after(() => {
        if (serverProc) serverProc.kill();
    });

    it('responds to ping', async () => {
        // Send JSON-RPC ping request
        const req = { jsonrpc: '2.0', id: 1, method: 'ping' };
        serverProc.stdin.write(JSON.stringify(req) + '\n');
        // Read response
        serverProc.stdout.once('data', (data: Buffer) => {
            stdoutData += data.toString();
        });
        await new Promise(res => setTimeout(res, 300));
        const lines = stdoutData.split('\n').filter(Boolean);
        const resp = JSON.parse(lines[0]);
        assert(resp.result);
        assert.deepEqual(resp.result, { ok: true });
    });

    it('handles invalid method', async () => {
        serverProc.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'invalid' }) + '\n');
        serverProc.stdout.once('data', (data: Buffer) => {
            stdoutData += data.toString();
        });
        await new Promise(res => setTimeout(res, 300));
        const lines = stdoutData.split('\n').filter(Boolean);
        const resp = JSON.parse(lines[1]); // After ping
        assert(resp.error);
        assert.equal(resp.error.code, -32601); // Method not found
    });

    it('handles malformed request', async () => {
        serverProc.stdin.write('not-json\n');
        serverProc.stdout.once('data', (data: Buffer) => {
            stdoutData += data.toString();
        });
        await new Promise(res => setTimeout(res, 300));
        const lines = stdoutData.split('\n').filter(Boolean);
        const resp = JSON.parse(lines[2]); // After ping and invalid
        assert(resp.error);
        assert.equal(resp.error.code, -32700); // Parse error
    });
});

// Placeholder for framing transport tests
describe('MCP Client/Server Integration (framing transport)', () => {
    it('detects stdio transport', () => {
        // Set env for stdio
        process.env.MCP_TRANSPORT_FRAMING = 'stdio';
        const config = detectTransportFraming();
        assert.equal(config.transport, 'stdio');
        assert.equal(config.framing, 'auto');
        delete process.env.MCP_TRANSPORT_FRAMING;
    });

    it('detects http transport', () => {
        process.env.MCP_TRANSPORT_FRAMING = 'http';
        process.env.MCP_HTTP_ENDPOINT = 'http://localhost:3000';
        const config = detectTransportFraming();
        assert.equal(config.transport, 'http');
        assert.equal(config.endpoint, 'http://localhost:3000');
        delete process.env.MCP_TRANSPORT_FRAMING;
        delete process.env.MCP_HTTP_ENDPOINT;
    });

    it('TODO: implement full framing transport tests', () => {
        assert(true);
    });
});