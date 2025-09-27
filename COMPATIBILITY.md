# Compatibility Matrix

| Framework Version | Node.js LTS | Notes                   |
|-------------------|-------------|-------------------------|
| 1.x               | 18, 20      | Initial GA              |
| 2.x               | 20, 22      | Dropped Node 18 support |

# Deprecation Policy

- Functions flagged as deprecated remain for **≥1 minor release** before removal.
- Deprecation must be noted in:
  - README.md
  - CHANGELOG.md
  - Inline JSDoc `@deprecated` tag

## Example

```js
/**
 * @deprecated Use greet(name) instead.
 */
export function hello(name) {
  return greet(name);
}