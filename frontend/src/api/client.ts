import { Workspace, Project, Service, Api } from '@carbon/shared';

const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (res.status === 204) return undefined as T;
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

// Active workspace
export const getActiveWorkspace = () =>
  request<{ workspace: string }>('/active-workspace');
export const setActiveWorkspace = (workspace: string) =>
  request<{ workspace: string }>('/active-workspace', {
    method: 'PUT',
    body: JSON.stringify({ workspace }),
  });

// Workspaces
export const getWorkspaces = () =>
  request<Workspace[]>('/workspaces');
export const createWorkspace = (data: { name: string; displayName?: string; description?: string }) =>
  request<Workspace>('/workspaces', { method: 'POST', body: JSON.stringify(data) });
export const deleteWorkspace = (name: string) =>
  request<void>(`/workspaces/${encodeURIComponent(name)}`, { method: 'DELETE' });

// Projects
export const getProjects = (ws: string) =>
  request<Project[]>(`/workspaces/${encodeURIComponent(ws)}/projects`);
export const createProject = (ws: string, data: { name: string; displayName?: string; description?: string }) =>
  request<Project>(`/workspaces/${encodeURIComponent(ws)}/projects`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
export const deleteProject = (ws: string, name: string) =>
  request<void>(`/workspaces/${encodeURIComponent(ws)}/projects/${encodeURIComponent(name)}`, {
    method: 'DELETE',
  });

// Services
export const getServices = (ws: string, proj: string) =>
  request<Service[]>(`/workspaces/${encodeURIComponent(ws)}/projects/${encodeURIComponent(proj)}/services`);
export const createService = (ws: string, proj: string, data: Service) =>
  request<Service>(
    `/workspaces/${encodeURIComponent(ws)}/projects/${encodeURIComponent(proj)}/services`,
    { method: 'POST', body: JSON.stringify(data) }
  );
export const updateService = (ws: string, proj: string, name: string, data: Partial<Omit<Service, 'name'>>) =>
  request<Service>(
    `/workspaces/${encodeURIComponent(ws)}/projects/${encodeURIComponent(proj)}/services/${encodeURIComponent(name)}`,
    { method: 'PATCH', body: JSON.stringify(data) }
  );
export const deleteService = (ws: string, proj: string, name: string) =>
  request<void>(
    `/workspaces/${encodeURIComponent(ws)}/projects/${encodeURIComponent(proj)}/services/${encodeURIComponent(name)}`,
    { method: 'DELETE' }
  );

// APIs
export const getApis = (ws: string, proj: string, svc: string) =>
  request<Api[]>(
    `/workspaces/${encodeURIComponent(ws)}/projects/${encodeURIComponent(proj)}/services/${encodeURIComponent(svc)}/apis`
  );
export const createApi = (ws: string, proj: string, svc: string, data: Omit<Api, never>) =>
  request<Api>(
    `/workspaces/${encodeURIComponent(ws)}/projects/${encodeURIComponent(proj)}/services/${encodeURIComponent(svc)}/apis`,
    { method: 'POST', body: JSON.stringify(data) }
  );
export const updateApi = (ws: string, proj: string, svc: string, name: string, data: Omit<Api, 'name'>) =>
  request<Api>(
    `/workspaces/${encodeURIComponent(ws)}/projects/${encodeURIComponent(proj)}/services/${encodeURIComponent(svc)}/apis/${encodeURIComponent(name)}`,
    { method: 'PUT', body: JSON.stringify(data) }
  );
export const deleteApi = (ws: string, proj: string, svc: string, name: string) =>
  request<void>(
    `/workspaces/${encodeURIComponent(ws)}/projects/${encodeURIComponent(proj)}/services/${encodeURIComponent(svc)}/apis/${encodeURIComponent(name)}`,
    { method: 'DELETE' }
  );
