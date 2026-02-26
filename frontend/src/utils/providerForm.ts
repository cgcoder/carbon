import {
  MockProviderConfig,
  RequestMatcherFunction,
  ResponseProviderConfig,
  StaticResponseProviderConfig,
  ScriptResponseProviderConfig,
  TemplateResponseProviderConfig,
  ProxyResponseProviderConfig,
  MultipartResponsePart,
} from '@carbon/shared';

export type ProviderType = 'static' | 'script' | 'template' | 'proxy';

export interface MultipartPartForm {
  contentType: string;
  body: string;
}

export interface ProviderFormItem {
  name: string;
  enabled: boolean;
  matcher: string;
  providerType: ProviderType;
  statusCode: number;
  headersRaw: string;
  body: string;
  isMultipart: boolean;
  multipartParts: MultipartPartForm[];
  script: string;
  template: string;
  targetUrl: string;
  injectLatencyMs: number;
  outgoingRequestBuilderScript: string;
  responseBuilderScript: string;
  scenarioIds: string[];
}

export const DEFAULT_PROVIDER: ProviderFormItem = {
  name: '',
  enabled: true,
  matcher: '',
  providerType: 'static',
  statusCode: 200,
  headersRaw: 'Content-Type: application/json',
  body: '',
  isMultipart: false,
  multipartParts: [] as MultipartPartForm[],
  script: '',
  template: '',
  targetUrl: '',
  injectLatencyMs: 0,
  outgoingRequestBuilderScript: '',
  responseBuilderScript: '',
  scenarioIds: ['default'],
};

export const PROVIDER_TYPE_OPTIONS: Array<{ type: ProviderType; label: string; description: string }> = [
  { type: 'static', label: 'Static', description: 'Return a fixed response body with configurable status and headers.' },
  { type: 'script', label: 'Script', description: 'Execute a JavaScript snippet to dynamically generate the response body.' },
  { type: 'template', label: 'Template', description: 'Render a Mustache template against the incoming request context.' },
  { type: 'proxy', label: 'Proxy', description: 'Forward the request to a downstream service and return its response.' },
];

export function parseHeaders(raw: string): Record<string, string> {
  return Object.fromEntries(
    raw.split('\n')
      .map(line => {
        const idx = line.indexOf(':');
        return idx > 0 ? [line.slice(0, idx).trim(), line.slice(idx + 1).trim()] : null;
      })
      .filter((parts): parts is [string, string] => parts !== null && parts[0].length > 0)
  );
}

export function headersToRaw(headers: Record<string, string>): string {
  return Object.entries(headers).map(([k, v]) => `${k}: ${v}`).join('\n');
}

export function mockProviderToForm(p: MockProviderConfig): ProviderFormItem {
  const resp = p.provider;
  const type: ProviderType = resp.type === 'scenario' ? 'static' : resp.type;
  const hasBase = resp.type !== 'scenario';
  return {
    name: p.name,
    enabled: p.enabled !== false,
    matcher: p.matcher.body,
    providerType: type,
    statusCode: hasBase ? (resp as StaticResponseProviderConfig).statusCode : 200,
    headersRaw: hasBase ? headersToRaw((resp as StaticResponseProviderConfig).headers) : '',
    body: resp.type === 'static' ? (resp as StaticResponseProviderConfig).body : '',
    isMultipart: resp.type === 'static' ? !!((resp as StaticResponseProviderConfig).multipartParts?.length) : false,
    multipartParts: resp.type === 'static'
      ? ((resp as StaticResponseProviderConfig).multipartParts ?? []).map(p => ({
          contentType: p.contentType ?? '',
          body: p.body,
        }))
      : [],
    script: resp.type === 'script' ? (resp as ScriptResponseProviderConfig).script : '',
    template: resp.type === 'template' ? (resp as TemplateResponseProviderConfig).template : '',
    targetUrl: resp.type === 'proxy' ? (resp as ProxyResponseProviderConfig).targetUrl : '',
    injectLatencyMs: hasBase ? ((resp as StaticResponseProviderConfig).injectLatencyMs ?? 0) : 0,
    outgoingRequestBuilderScript: resp.type === 'proxy' ? ((resp as ProxyResponseProviderConfig).outgoingRequestBuilderScript ?? '') : '',
    responseBuilderScript: resp.type === 'proxy' ? ((resp as ProxyResponseProviderConfig).responseBuilderScript ?? '') : '',
    scenarioIds: p.scenarioIds ?? [],
  };
}

export function formToMockProviderConfig(item: ProviderFormItem): MockProviderConfig {
  const headers = parseHeaders(item.headersRaw);
  const base = {
    statusCode: Number(item.statusCode),
    headers,
    ...(item.injectLatencyMs > 0 && { injectLatencyMs: item.injectLatencyMs }),
  };
  let provider: ResponseProviderConfig;
  switch (item.providerType) {
    case 'static': {
      const multipartParts: MultipartResponsePart[] | undefined =
        item.isMultipart && item.multipartParts.length > 0
          ? item.multipartParts.map(p => ({
              ...(p.contentType && { contentType: p.contentType }),
              body: p.body,
            }))
          : undefined;
      provider = {
        type: 'static',
        ...base,
        body: item.isMultipart ? '' : item.body,
        ...(multipartParts && { multipartParts }),
      };
      break;
    }
    case 'script':
      provider = { type: 'script', ...base, script: item.script };
      break;
    case 'template':
      provider = { type: 'template', ...base, template: item.template };
      break;
    case 'proxy':
      provider = {
        type: 'proxy',
        ...base,
        targetUrl: item.targetUrl.trim(),
        ...(item.outgoingRequestBuilderScript.trim() && { outgoingRequestBuilderScript: item.outgoingRequestBuilderScript.trim() }),
        ...(item.responseBuilderScript.trim() && { responseBuilderScript: item.responseBuilderScript.trim() }),
      };
      break;
  }
  const matcher: RequestMatcherFunction = { body: item.matcher };
  return {
    name: item.name,
    enabled: item.enabled,
    matcher,
    provider,
    ...(item.scenarioIds.length > 0 && { scenarioIds: item.scenarioIds }),
  };
}
