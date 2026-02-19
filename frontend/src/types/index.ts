// Re-export new shared model types
export type {
  Workspace,
  Service,
  ServiceEnvironment,
  Api,
  HttpMethod,
  MockRequest,
  GlobalVars,
  StaticResponseProviderConfig,
  ScriptResponseProviderConfig,
  TemplateResponseProviderConfig,
  ProxyResponseProviderConfig,
  ScenarioResponseProviderConfig,
  Scenario,
  ResponseProviderConfig,
} from '@carbon/shared';
export { GLOBAL_VARS } from '@carbon/shared';

import type { Project as BaseProject } from '@carbon/shared';

// Extended Project type — adds legacy fields for frontend components pending migration
export type Project = BaseProject & {
  id: string;
  basePath: string;
  createdAt: string;
  updatedAt: string;
};

// ---- Legacy stub types — frontend components will be rewritten in a later step ----

export type StaticResponse = {
  type: 'static';
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  delay?: number;
};

export type ProxyResponse = {
  type: 'proxy';
  targetUrl: string;
  timeout?: number;
  modifyHeaders?: Record<string, string>;
};

export type DynamicResponse = {
  type: 'dynamic';
  statusCode: number;
  headers: Record<string, string>;
  script: string;
  delay?: number;
};

export type MockResponse = StaticResponse | ProxyResponse | DynamicResponse;

export interface MockEndpoint {
  id: string;
  projectId: string;
  path: string;
  method: string;
  response: MockResponse;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RequestLog {
  id: string;
  projectId: string;
  endpointId: string;
  timestamp: string;
  method: string;
  path: string;
  headers: Record<string, string>;
  body: string | null;
  responseStatus: number;
  responseBody: string;
  duration: number;
}
