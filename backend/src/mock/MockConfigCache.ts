import { Workspace, Project, Service, Api } from '@carbon/shared';
import { fileStore } from '../storage/FileStore';
import { activeWorkspaceStore } from '../storage/ActiveWorkspaceStore';

/** Full context for a single API — the unit the mock handler matches against. */
export interface CachedEntry {
  workspace: Workspace;
  project: Project;
  service: Service;
  api: Api;
  /** Pre-compiled function for script response providers. Undefined for other response types. */
  compiledScriptFn?: (request: unknown) => unknown;
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
          for (const api of fileStore.getApis(wsName, project.name, service.name)) {
            let compiledScriptFn: CachedEntry['compiledScriptFn'];
            if (api.response.type === 'script') {
              try {
                // eslint-disable-next-line no-new-func
                compiledScriptFn = new Function('request', api.response.script) as CachedEntry['compiledScriptFn'];
              } catch {
                // Script has a syntax error; leave compiledScriptFn undefined so the handler can report the error at request time.
              }
            }
            next.push({ workspace, project, service, api, compiledScriptFn });
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
