export interface MarkdownUriParts {
  readonly path: string;
  readonly query: string;
  readonly scheme: string;
}

const managedSchemes = new Set(['file', 'git']);

export function getMarkdownResourcePath(uri: MarkdownUriParts): string {
  if (uri.scheme === 'git' && uri.query) {
    try {
      const query = JSON.parse(uri.query) as { path?: unknown };
      if (typeof query.path === 'string' && query.path) {
        return query.path;
      }
    } catch {
      // Fall back to the URI path when another Git provider uses a different query.
    }
  }

  return uri.path;
}

export function isManagedMarkdownResource(uri: MarkdownUriParts): boolean {
  return managedSchemes.has(uri.scheme)
    && /\.md$/i.test(getMarkdownResourcePath(uri));
}

export function distinctPreferredValues<T>(preferred: T, fallback: T, key: (value: T) => string): readonly T[] {
  return key(preferred) === key(fallback) ? [preferred] : [preferred, fallback];
}
