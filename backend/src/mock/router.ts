import { Router, Request, Response } from 'express';
import Mustache from 'mustache';
import { StaticResponseProviderConfig, ScriptResponseProviderConfig, TemplateResponseProviderConfig, MockRequest, HttpMethod } from '@carbon/shared';
import { mockConfigCache, CachedEntry } from './MockConfigCache';

const router = Router();

/** Per-service request counter, keyed by "workspace/project/service". */
const requestCounters = new Map<string, number>();

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function buildMockRequest(req: Request, entry: CachedEntry): MockRequest {
  const serviceKey = `${entry.workspace.name}/${entry.project.name}/${entry.service.name}`;
  const count = (requestCounters.get(serviceKey) ?? 0) + 1;
  requestCounters.set(serviceKey, count);

  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === 'string') {
      headers[key] = value;
    } else if (Array.isArray(value)) {
      headers[key] = value.join(', ');
    }
  }

  const queryParameters: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(req.query)) {
    if (typeof value === 'string') {
      queryParameters[key] = [value];
    } else if (Array.isArray(value)) {
      queryParameters[key] = value.filter((v): v is string => typeof v === 'string');
    }
  }

  let body: string | undefined;
  if (req.body !== undefined && req.body !== null && req.body !== '') {
    body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  }

  return {
    method: req.method.toUpperCase() as HttpMethod,
    url: `${req.protocol}://${req.get('host') ?? ''}${req.originalUrl}`,
    path: req.path,
    hostname: req.hostname,
    headers,
    queryParameters,
    apiName: entry.api.name,
    body,
    requestNumber: count,
  };
}

async function handleStatic(
  res: Response,
  config: StaticResponseProviderConfig,
  latencyMs: number
): Promise<void> {
  if (latencyMs > 0) await delay(latencyMs);
  res.status(config.statusCode);
  for (const [key, value] of Object.entries(config.headers)) {
    res.setHeader(key, value);
  }
  res.send(config.body);
}

async function handleScript(
  res: Response,
  config: ScriptResponseProviderConfig,
  mockReq: MockRequest,
  latencyMs: number,
  compiledScriptFn: ((request: unknown) => unknown) | undefined
): Promise<void> {
  if (latencyMs > 0) await delay(latencyMs);

  if (!compiledScriptFn) {
    res.status(500).json({ error: 'Script compilation failed', details: 'The script could not be compiled. Check for syntax errors.' });
    return;
  }

  let result: unknown;
  try {
    result = await compiledScriptFn(mockReq);
  } catch (err) {
    res.status(500).json({ error: 'Script execution failed', details: String(err) });
    return;
  }

  res.status(config.statusCode);
  for (const [key, value] of Object.entries(config.headers)) {
    res.setHeader(key, value);
  }

  if (typeof result === 'string') {
    res.send(result);
  } else {
    res.json(result);
  }
}

async function handleTemplate(
  res: Response,
  config: TemplateResponseProviderConfig,
  mockReq: MockRequest,
  latencyMs: number
): Promise<void> {
  if (latencyMs > 0) await delay(latencyMs);

  let rendered: string;
  try {
    rendered = Mustache.render(config.template, { request: mockReq });
  } catch (err) {
    res.status(500).json({ error: 'Template rendering failed', details: String(err) });
    return;
  }

  res.status(config.statusCode);
  for (const [key, value] of Object.entries(config.headers)) {
    res.setHeader(key, value);
  }
  res.send(rendered);
}

router.all('*', async (req: Request, res: Response) => {
  const method = req.method.toUpperCase();

  for (const entry of mockConfigCache.getAll()) {
    const { service, api } = entry;
    if (api.method !== method) continue;

    if (service.matchHostName) {
      const reqHost = (req.headers['host'] ?? '').split(':')[0]; // strip port if present
      if (reqHost !== service.hostname) continue;
    }

    if (service.urlPrefix) {
      if (!req.path.startsWith(service.urlPrefix)) continue;
    }

    const pathToMatch = service.urlPrefix
      ? req.path.slice(service.urlPrefix.length) || '/'
      : req.path;

    let matches = false;
    try {
      matches = new RegExp(api.urlPattern).test(pathToMatch);
    } catch {
      // Invalid regex in config — skip
      continue;
    }
    if (!matches) continue;

    const response = api.response;
    // Combine service-level and response-level latency.
    // ScenarioResponseProviderConfig doesn't extend BaseResponseProviderConfig, so has no injectLatencyMs.
    const responseLatencyMs = response.type !== 'scenario' ? (response.injectLatencyMs ?? 0) : 0;
    const latencyMs = (service.injectLatencyMs ?? 0) + responseLatencyMs;

    switch (response.type) {
      case 'static':
        await handleStatic(res, response, latencyMs);
        return;

      case 'script': {
        const mockReq = buildMockRequest(req, entry);
        await handleScript(res, response, mockReq, latencyMs, entry.compiledScriptFn);
        return;
      }

      case 'template': {
        const mockReq = buildMockRequest(req, entry);
        await handleTemplate(res, response, mockReq, latencyMs);
        return;
      }

      case 'proxy':
      case 'scenario':
        res.status(501).json({ error: `Response provider type "${response.type}" is not yet implemented` });
        return;
    }
  }

  res.status(404).json({ error: 'No matching API found' });
});

export default router;
