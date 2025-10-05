import { matchUriTemplate, resolveUriTemplate } from '../src/resource-template.js';

describe('resource template matcher', () => {
    test('matches simple file template', () => {
        const template = 'file://{path}';
        const uri = 'file:///etc/hosts';
        const params = matchUriTemplate(uri, template);
        expect(params).not.toBeNull();
        expect(params!.path).toBe('/etc/hosts');
    });

    test('resolves template', () => {
        const template = 'https://example.com/repos/{owner}/{repo}/blob/{ref}/{path}';
        const params = { owner: 'debian777', repo: 'mcp-framework', ref: 'main', path: 'README.md' };
        const uri = resolveUriTemplate(template, params);
        expect(uri).toContain('debian777');
        expect(uri).toContain('README.md');
    });
});
