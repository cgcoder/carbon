import { Router, Request, Response } from 'express';
import { StaticResponseProviderConfig } from '@carbon/shared';
import { mockConfigCache } from './MockConfigCache';

const router = Router();

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
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

router.all('*', async (req: Request, res: Response) => {
  const method = req.method.toUpperCase();

  for (const { service, api } of mockConfigCache.getAll()) {
    if (api.method !== method) continue;

    if (service.matchHostName) {
      const reqHost = (req.headers['host'] ?? '').split(':')[0]; // strip port if present
      if (reqHost !== service.hostname) continue;
    }

    let matches = false;
    try {
      matches = new RegExp(api.urlPattern).test(req.path);
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

      case 'script':
      case 'template':
      case 'proxy':
      case 'scenario':
        res.status(501).json({ error: `Response provider type "${response.type}" is not yet implemented` });
        return;
    }
  }

  res.status(404).json({ error: 'No matching API found' });
});

export default router;
