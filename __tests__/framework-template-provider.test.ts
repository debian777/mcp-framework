import { FrameworkServer } from '../src/framework/server/framework-server.js';
import { TemplateProvider } from '../src/examples/providers/template-provider.js';

describe('FrameworkServer with TemplateProvider', () => {
    test('reads resource using template', async () => {
        const server = new FrameworkServer({ name: 'test', version: '0.0.1' });
        const provider = new TemplateProvider({ name: 'template-provider' });
        server.registerResourceProvider(provider);

        const result = await server.readResource('file:///etc/hosts');
        expect(result.contents[0].text).toBe('content-of:/etc/hosts');
    });
});
