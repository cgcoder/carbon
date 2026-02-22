import { Request } from 'express';
import { mockConfigCache, CachedEntry } from './MockConfigCache';

export type MatchResult =
  | { matched: true; entry: CachedEntry }
  | { matched: false; statusCode: number; error: string };

/**
 * Finds the first CachedEntry whose service+api configuration matches the
 * incoming request (method, hostname, URL prefix, URL pattern).
 *
 * Returns a successful match with the entry, or a failure with the appropriate
 * HTTP status code and error message to send back to the caller.
 */
export function matchRequest(req: Request): MatchResult {
  const method = req.method.toUpperCase();

  for (const entry of mockConfigCache.getAll()) {
    const { service, api } = entry;

    if (api.method !== method) continue;

    if (service.matchHostName) {
      const reqHost = (req.headers['host'] ?? '').split(':')[0];
      if (reqHost !== service.hostname) continue;
    }

    if (service.urlPrefix) {
      if (!req.path.startsWith(service.urlPrefix)) continue;
    }

    const pathToMatch = service.urlPrefix
      ? req.path.slice(service.urlPrefix.length) || '/'
      : req.path;

    if (!api.testUrl(pathToMatch)) continue;

    return { matched: true, entry };
  }

  return { matched: false, statusCode: 404, error: 'No matching API found' };
}
