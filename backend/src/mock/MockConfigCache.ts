import { Workspace, Project, Service, MockRequest, ResponseProviderConfig } from '@carbon/shared';
import { fileStore } from '../storage/FileStore';
import { activeWorkspaceStore } from '../storage/ActiveWorkspaceStore';
import { CompiledRequestMatcherFunction } from '../types/CompiledRequestMatcherFunction';
import { CompiledApi } from '../types/CompiledApi';
import { CompiledProxyResponseProviderConfig } from '../types/CompiledProxyResponseProviderConfig';
import { OutgoingRequest } from '../types/OutgoingRequest';

/** Pre-compiled functions for a single MockProviderConfig entry. */
export interface CompiledProvider {
  matcher: CompiledRequestMatcherFunction;
  /** Pre-compiled script function for providers of type 'script'. Undefined for other types or on compile error. */
  compiledScriptFn?: (request: unknown) => unknown;
  /** Pre-compiled proxy config for providers of type 'proxy'. Always present when provider type is 'proxy'. */
  compiledProxyConfig?: CompiledProxyResponseProviderConfig;
  responseProviderConfig: ResponseProviderConfig;
}

/** Full context for a single API — the unit the mock handler matches against. */
export interface CachedEntry {
  workspace: Workspace;
  project: Project;
  service: Service;
  api: CompiledApi;
  compiledProviders: CompiledProvider[];
}

export class MockConfigCache {
  private entries: CachedEntry[] = [];

  /**
   * Loads all APIs for the current active workspace into the in-memory cache.
   * APIs belonging to inactive workspaces are not considered for mock routing.
   */
  load(): void {
    const wsName = activeWorkspaceStore.get();
    const next: CachedEntry[] = [];
    const workspace = fileStore.getWorkspace(wsName);
    if (workspace) {
      for (const project of fileStore.getProjects(wsName)) {
        for (const service of fileStore.getServices(wsName, project.name)) {
          if (service.enabled === false) continue;
          for (const api of fileStore.getApis(wsName, project.name, service.name)) {
            if (api.enabled === false || !api.providers) continue;
            const compiledProviders: CompiledProvider[] = api.providers.map(p => {
              const matcher = new CompiledRequestMatcherFunction(p.matcher);

              let compiledScriptFn: CompiledProvider['compiledScriptFn'];
              if (p.provider.type === 'script') {
                try {
                  // eslint-disable-next-line no-new-func
                  compiledScriptFn = new Function('request', p.provider.script) as (request: unknown) => unknown;
                } catch {
                  // Script has a syntax error; leave undefined so the handler can report the error at request time.
                }
              }

              let compiledProxyConfig: CompiledProvider['compiledProxyConfig'];
              if (p.provider.type === 'proxy') {
                compiledProxyConfig = { ...p.provider };
                if (p.provider.outgoingRequestBuilderScript) {
                  try {
                    // eslint-disable-next-line no-new-func
                    compiledProxyConfig.outgoingRequestBuilderCompiledFn = new Function(
                      'request',
                      'proxyRequest',
                      p.provider.outgoingRequestBuilderScript
                    ) as (mockRequest: MockRequest, proxyRequest: OutgoingRequest) => void;
                  } catch {
                    // Script has a syntax error; leave undefined so the handler can report the error at request time.
                  }
                }
                if (p.provider.responseBuilderScript) {
                  try {
                    compiledProxyConfig.responseBuilderScriptCompiledFn = new Function('request',
                      'proxyRequest',
                      'response',
                      p.provider.responseBuilderScript) as (mockRequest: MockRequest, proxyRequest: OutgoingRequest, response: unknown) => void;
                  } catch {

                  }
                }
              }

              return { matcher, compiledScriptFn, compiledProxyConfig, responseProviderConfig: p.provider };
            });

            next.push({ workspace, project, service, api: new CompiledApi(api), compiledProviders });
          }
        }
      }
    }
    this.entries = next;
  }

  /** Returns all cached entries for the mock handler to iterate through. */
  getAll(): CachedEntry[] {
    return this.entries;
  }
}

export const mockConfigCache = new MockConfigCache();
