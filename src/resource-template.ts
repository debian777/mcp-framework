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

// Named exports only (avoid duplicate/default export)

/**
 * Validate a uri template. Ensures the template contains a supported scheme
 * (https:, file:, git:) and that placeholders are valid identifiers.
 */
export function validateTemplate(template: string): boolean {
    if (typeof template !== 'string' || template.length === 0) return false;
    // Basic scheme check: must start with scheme://
    const schemeMatch = template.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):\/\//);
    if (!schemeMatch) return false;
    const scheme = schemeMatch[1] + ':';
    if (!['https:', 'file:', 'git:'].includes(scheme)) return false;

    // Placeholders must be alphanumeric, underscore or dash
    const invalidPlaceholder = template.match(/\{([^}]+)\}/g)?.some((ph) => !/^\{[a-zA-Z0-9_\-]+\}$/.test(ph));
    if (invalidPlaceholder) return false;

    // No spaces allowed in template
    if (template.includes(' ')) return false;

    return true;
}

// validateTemplate exported by its declaration above
