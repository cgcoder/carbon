import { Router, Request, Response } from 'express';
import Mustache from 'mustache';
import axios, { AxiosResponseHeaders } from 'axios';
import zlib from 'zlib';
import { promisify } from 'util';
import { StaticResponseProviderConfig, ScriptResponseProviderConfig, TemplateResponseProviderConfig, MockRequest, MockRequestPart, HttpMethod, DEFAULT_SCENARIO_ID } from '@carbon/shared';
import { fileStore } from '../storage/FileStore';

const gunzip = promisify(zlib.gunzip);
const inflate = promisify(zlib.inflate);
const brotliDecompress = promisify(zlib.brotliDecompress);
import { CompiledProxyResponseProviderConfig } from '../types/CompiledProxyResponseProviderConfig';
import { OutgoingRequest } from '../types/OutgoingRequest';
import { CachedEntry, CompiledProvider } from './MockConfigCache';
import { matchRequest } from './matcher';
import { requestLogger } from './RequestLogger';

const router = Router();
type HeaderType = Record<string, string | string[]>

function extractBoundary(contentType: string): string | null {
  const match = contentType.match(/boundary=(?:"([^"]+)"|([^\s;,]+))/i);
  return match ? (match[1] ?? match[2]) : null;
}

function parseMultipartMixed(rawBody: Buffer, boundary: string): MockRequestPart[] {
  const parts: MockRequestPart[] = [];
  // Use binary (latin1) to preserve byte values across the split
  const bodyStr = rawBody.toString('binary');
  const sections = bodyStr.split(`--${boundary}`);

  let partIndex = 0;
  for (const section of sections) {
    // Skip preamble and final boundary (--)
    if (!section.startsWith('\r\n') && !section.startsWith('\n')) continue;
    if (section.trimStart().startsWith('--')) continue;

    const content = section.replace(/^\r?\n/, '');
    const sep = content.indexOf('\r\n\r\n');
    if (sep === -1) continue;

    const headersStr = content.substring(0, sep);
    let partBody = content.substring(sep + 4);
    if (partBody.endsWith('\r\n')) partBody = partBody.slice(0, -2);

    const partHeaders: Record<string, string> = {};
    for (const line of headersStr.split('\r\n')) {
      const idx = line.indexOf(':');
      if (idx > 0) {
        partHeaders[line.slice(0, idx).trim().toLowerCase()] = line.slice(idx + 1).trim();
      }
    }

    const contentType = partHeaders['content-type'] ?? 'text/plain';
    const contentDisposition = partHeaders['content-disposition'] ?? '';
    const contentId = partHeaders['content-id'] ?? '';

    const name = contentId.replace(/^<|>$/g, '') || `part-${partIndex}`;
    const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
    const filename = filenameMatch ? filenameMatch[1] : undefined;

    const isText = contentType.startsWith('text/') || contentType.includes('json') || contentType.includes('xml');
    const partBuffer = Buffer.from(partBody, 'binary');
    const data = isText ? partBuffer.toString('utf-8') : partBuffer.toString('base64');

    parts.push({ name, filename, contentType, data, isBase64: !isText });
    partIndex++;
  }

  return parts;
}

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

  const rawContentType = req.headers['content-type'] ?? '';
  const isMultipart = rawContentType.toLowerCase().includes('multipart/mixed');

  let body: string | undefined;
  let multipartParts: MockRequestPart[] | undefined;

  if (isMultipart) {
    const boundary = extractBoundary(rawContentType);
    multipartParts = (boundary && Buffer.isBuffer(req.body))
      ? parseMultipartMixed(req.body, boundary)
      : [];
  } else if (req.body !== undefined && req.body !== null && req.body !== '') {
    if (typeof req.body === 'string') {
      body = req.body;
    } else {
      try {
        body = JSON.stringify(req.body);
      } catch {
        body = String(req.body);
      }
    }
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
    multipartParts,
    requestNumber: count,
    timestamp: new Date().toISOString(),
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

  if (config.multipartParts && config.multipartParts.length > 0) {
    const boundary = `CarbonMixed${Date.now()}`;
    const lines: string[] = [];
    for (const part of config.multipartParts) {
      lines.push(`--${boundary}`);
      lines.push(`Content-Type: ${part.contentType ?? 'text/plain'}`);
      lines.push('');
      lines.push(part.body);
    }
    lines.push(`--${boundary}--`);
    const multipartBody = lines.join('\r\n');
    res.setHeader('Content-Type', `multipart/mixed; boundary=${boundary}`);
    res.send(multipartBody);
    return;
  }

  res.send(config.body);
}

async function handleScript(
  res: Response,
  config: ScriptResponseProviderConfig,
  mockReq: MockRequest,
  latencyMs: number,
  compiledScriptFn: CompiledProvider['compiledScriptFn']
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

async function decompressBody(buffer: Buffer, encoding: string): Promise<string> {
  const enc = encoding.toLowerCase();
  if (enc === 'gzip' || enc === 'x-gzip') {
    return (await gunzip(buffer)).toString('utf-8');
  } else if (enc === 'deflate') {
    return (await inflate(buffer)).toString('utf-8');
  } else if (enc === 'br') {
    return (await brotliDecompress(buffer)).toString('utf-8');
  }
  return buffer.toString('utf-8');
}

// Headers that must not be forwarded between proxies (RFC 2616 §13.5.1)
const HOP_BY_HOP_HEADERS = new Set([
  'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
  'te', 'trailers', 'transfer-encoding', 'upgrade', 'host',
]);

async function handleProxy(
  res: Response,
  config: CompiledProxyResponseProviderConfig,
  mockReq: MockRequest,
  latencyMs: number
): Promise<void> {
  if (latencyMs > 0) await delay(latencyMs);

  // Build the initial OutgoingRequest from the mock request, stripping hop-by-hop headers.
  const forwardHeaders: Record<string, string> = {};
  for (const [key, value] of Object.entries(mockReq.headers)) {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      forwardHeaders[key] = value;
    }
  }

  const proxyRequest: OutgoingRequest = {
    url: config.targetUrl.replace(/\/$/, '') + mockReq.path,
    method: mockReq.method,
    headers: forwardHeaders,
    queryParameters: { ...mockReq.queryParameters },
    body: mockReq.body,
  };
  if (proxyRequest.body === "{}") {
    proxyRequest.body = undefined; // Treat empty JSON object as no body, since some downstream services may reject an empty body.
  }
  // Allow the user-supplied script to mutate the proxy request before it is sent.
  if (config.outgoingRequestBuilderCompiledFn) {
    try {
      config.outgoingRequestBuilderCompiledFn(mockReq, proxyRequest);
      proxyRequest.url = config.targetUrl.replace(/\/$/, '') + proxyRequest.url; // Ensure the URL is absolute for axios after mutation.
    } catch (err) {
      res.status(500).json({ error: 'Proxy request builder script failed', details: String(err) });
      return;
    }
  }

  // Append query parameters to the URL.
  const targetUrl = new URL(proxyRequest.url);
  for (const [key, values] of Object.entries(proxyRequest.queryParameters)) {
    for (const value of values) {
      targetUrl.searchParams.append(key, value);
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let proxyResponse: import('axios').AxiosResponse<any>;
  try {
    proxyResponse = await axios.request({
      method: proxyRequest.method,
      url: proxyRequest.url.toString(),
      headers: proxyRequest.headers,
      data: proxyRequest.body,
      responseType: 'arraybuffer',
      validateStatus: () => true,
      decompress: false,
    });
  } catch (err) {
    res.status(502).json({ error: 'Proxy request failed', details: String(err) });
    return;
  }

  const responseBodyBuffer = Buffer.from(proxyResponse.data);
  const responseHeaders = { ...proxyResponse.headers };

  if (config.responseBuilderScriptCompiledFn) {
    // Decompress the body to a string so the script can read/modify it.
    const encoding = (responseHeaders['content-encoding'] as string ?? '');
    const decompressed = await decompressBody(responseBodyBuffer, encoding);
    // Remove content-encoding since we've decompressed the body.
    delete responseHeaders['content-encoding'];

    const mutableResponse = {
      status: proxyResponse.status,
      headers: responseHeaders,
      body: decompressed,
    };

    try {
      config.responseBuilderScriptCompiledFn(mockReq, proxyRequest, mutableResponse);
    } catch (err) {
      res.status(500).json({ error: 'Proxy response builder script failed', details: String(err) });
      return;
    }
    copyHeaderToResponse(res, mutableResponse.headers as HeaderType);

    res.status(mutableResponse.status);
    res.send(mutableResponse.body);
  } else {
    copyHeaderToResponse(res, responseHeaders as HeaderType);
    res.status(proxyResponse.status);
    res.send(responseBodyBuffer);
  }
}

function copyHeaderToResponse(res: Response<any, Record<string, any>>, headers: HeaderType) {
  for (const [key, value] of Object.entries(headers)) {
    if (HOP_BY_HOP_HEADERS.has(key.toLowerCase())) continue;
    if (value !== undefined) {
      res.setHeader(key, value as string | string[]);
    }
  }
}

router.all('*', async (req: Request, res: Response) => {
  const startTime = Date.now();

  let rawBody: string | null = null;
  if ((req.headers['content-type'] ?? '').toLowerCase().includes('multipart/mixed')) {
    rawBody = '[multipart/mixed]';
  } else if (req.body !== undefined && req.body !== null && req.body !== '') {
    if (typeof req.body === 'string') {
      rawBody = req.body;
    } else {
      try {
        rawBody = JSON.stringify(req.body);
      } catch {
        rawBody = String(req.body);
      }
    }
  }

  const result = matchRequest(req);
  let providerName: string | undefined;

  res.on('finish', () => {
    requestLogger.log({
      timestamp: new Date().toISOString(),
      method: req.method.toUpperCase(),
      url: req.originalUrl,
      path: req.path,
      hostname: req.hostname,
      body: requestLogger.truncateBody(rawBody),
      statusCode: res.statusCode,
      matched: result.matched,
      service: result.matched ? result.entry.service.name : undefined,
      project: result.matched ? result.entry.project.name : undefined,
      apiName: result.matched ? result.entry.api.name : undefined,
      providerName,
      durationMs: Date.now() - startTime,
    });
  });

  if (!result.matched) {
    res.status(result.statusCode).json({ error: result.error });
    return;
  }

  const { entry } = result;
  const { service, api } = entry;

  // Find the first MockProviderConfig whose matcher passes.
  const mockReq = buildMockRequest(req, entry);
  requestLogger.logMockRequest(mockReq);

  const activeScenarioId = fileStore.getProject(entry.workspace.name, entry.project.name)?.activeScenarioId ?? DEFAULT_SCENARIO_ID;

  let matchedIndex = -1;
  for (let i = 0; i < api.providers.length; i++) {
    if (api.providers[i].enabled === false) continue;
    const providerScenarioIds = api.providers[i].scenarioIds;
    if (providerScenarioIds && providerScenarioIds.length > 0 && !providerScenarioIds.includes(activeScenarioId)) continue;
    const compiled = entry.compiledProviders[i];
    if (compiled.matcher.matches(mockReq)) {
      matchedIndex = i;
      break;
    }
  }

  if (matchedIndex === -1) {
    res.status(422).json({ error: 'No provider matched this request' });
    return;
  }

  providerName = api.providers[matchedIndex].name;
  const providerConfig = api.providers[matchedIndex].provider;
  const compiled = entry.compiledProviders[matchedIndex];

  // Combine service-level and provider-level latency.
  const providerLatencyMs = providerConfig.type !== 'scenario' ? (providerConfig.injectLatencyMs ?? 0) : 0;
  const latencyMs = (service.injectLatencyMs ?? 0) + providerLatencyMs;

  switch (providerConfig.type) {
    case 'static':
      await handleStatic(res, providerConfig, latencyMs);
      return;

    case 'script':
      await handleScript(res, providerConfig, mockReq, latencyMs, compiled.compiledScriptFn);
      return;

    case 'template':
      await handleTemplate(res, providerConfig, mockReq, latencyMs);
      return;

    case 'proxy':
      await handleProxy(res, compiled.compiledProxyConfig!, mockReq, latencyMs);
      return;

    case 'scenario':
      res.status(501).json({ error: `Response provider type "scenario" is not yet implemented` });
      return;
  }
});

export default router;
