/**
 * Simple URI template resolver/matcher.
 * Supports templates with {placeholder} tokens. Example:
 *   file://{path}
 *   https://example.com/repos/{owner}/{repo}/blob/{ref}/{path}
 *
 * matchUriTemplate(template, uri) -> returns params object or null
 */

export function templateToRegex(template: string): { regex: RegExp; keys: string[] } {
    const keys: string[] = [];
    // Escape regex metacharacters, then replace {name} with a capture group
    const pattern = template.replace(/[-/\\^$+?.()|[\]{}]/g, (m) => {
        return m === '{' || m === '}' ? m : `\\${m}`;
    }).replace(/\{([a-zA-Z0-9_\-]+)\}/g, (_m, key) => {
        keys.push(key);
        return '(.+?)';
    });

    const regex = new RegExp(`^${pattern}$`);
    return { regex, keys };
}

export function matchUriTemplate(uri: string, template: string): Record<string, string> | null {
    const { regex, keys } = templateToRegex(template);
    const m = regex.exec(uri);
    if (!m) return null;
    const params: Record<string, string> = {};
    for (let i = 0; i < keys.length; i++) {
        params[keys[i]] = decodeURIComponent(m[i + 1]);
    }
    return params;
}

export function resolveUriTemplate(template: string, params: Record<string, any>): string {
    return template.replace(/\{([a-zA-Z0-9_\-]+)\}/g, (_m, key) => {
        const v = params[key];
        return v == null ? '' : encodeURIComponent(String(v));
    });
}

export default { matchUriTemplate, resolveUriTemplate };
