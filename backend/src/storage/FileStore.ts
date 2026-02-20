import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';
import { config } from '../config';
import {
  Workspace,
  Project,
  Service,
  Api,
} from '@carbon/shared';

export type StoredApi = Api;

// ---- FileStore ----

export class FileStore extends EventEmitter {
  private workspacesCache: Workspace[] | null = null;
  private projectsCache: Map<string, Project[]> = new Map();
  private servicesCache: Map<string, Service[]> = new Map();
  private apisCache: Map<string, StoredApi[]> = new Map();

  // --- Path helpers ---

  private workspaceDir(ws: string): string {
    return path.join(config.dataDir, ws);
  }

  private workspaceFile(ws: string): string {
    return path.join(this.workspaceDir(ws), 'workspace.json');
  }

  private projectDir(ws: string, proj: string): string {
    return path.join(this.workspaceDir(ws), proj);
  }

  private projectFile(ws: string, proj: string): string {
    return path.join(this.projectDir(ws, proj), 'project.json');
  }

  private serviceDir(ws: string, proj: string, svc: string): string {
    return path.join(this.projectDir(ws, proj), svc);
  }

  private serviceFile(ws: string, proj: string, svc: string): string {
    return path.join(this.serviceDir(ws, proj, svc), 'service.json');
  }

  private apisFile(ws: string, proj: string, svc: string): string {
    return path.join(this.serviceDir(ws, proj, svc), 'apis.json');
  }

  // --- Init ---

  init(): void {
    fs.mkdirSync(config.dataDir, { recursive: true });
    const hasWorkspace = fs.readdirSync(config.dataDir).some(d => {
      const full = path.join(config.dataDir, d);
      return fs.statSync(full).isDirectory() && fs.existsSync(path.join(full, 'workspace.json'));
    });
    if (!hasWorkspace) {
      this.saveWorkspace({
        name: 'Default',
        displayName: 'Default',
        description: 'Default workspace',
      });
    }
  }

  // --- Workspaces ---

  getWorkspaces(): Workspace[] {
    if (this.workspacesCache) return this.workspacesCache;
    const workspaces: Workspace[] = [];
    for (const d of fs.readdirSync(config.dataDir)) {
      const full = path.join(config.dataDir, d);
      const wsFile = path.join(full, 'workspace.json');
      if (fs.statSync(full).isDirectory() && fs.existsSync(wsFile)) {
        workspaces.push(JSON.parse(fs.readFileSync(wsFile, 'utf-8')) as Workspace);
      }
    }
    this.workspacesCache = workspaces;
    return workspaces;
  }

  getWorkspace(name: string): Workspace | undefined {
    return this.getWorkspaces().find(w => w.name === name);
  }

  saveWorkspace(ws: Workspace): void {
    const dir = this.workspaceDir(ws.name);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.workspaceFile(ws.name), JSON.stringify(ws, null, 2));
    if (this.workspacesCache) {
      const idx = this.workspacesCache.findIndex(w => w.name === ws.name);
      if (idx >= 0) {
        this.workspacesCache[idx] = ws;
      } else {
        this.workspacesCache.push(ws);
      }
    }
  }

  deleteWorkspace(name: string): boolean {
    const dir = this.workspaceDir(name);
    if (!fs.existsSync(dir) || !fs.existsSync(this.workspaceFile(name))) return false;
    fs.rmSync(dir, { recursive: true });
    if (this.workspacesCache) {
      this.workspacesCache = this.workspacesCache.filter(w => w.name !== name);
    }
    this.projectsCache.delete(name);
    for (const k of [...this.servicesCache.keys()]) {
      if (k.startsWith(`${name}/`)) this.servicesCache.delete(k);
    }
    for (const k of [...this.apisCache.keys()]) {
      if (k.startsWith(`${name}/`)) this.apisCache.delete(k);
    }
    this.emit('change');
    return true;
  }

  // --- Projects ---

  getProjects(ws: string): Project[] {
    if (this.projectsCache.has(ws)) return this.projectsCache.get(ws)!;
    const wsDir = this.workspaceDir(ws);
    const projects: Project[] = [];
    if (fs.existsSync(wsDir)) {
      for (const d of fs.readdirSync(wsDir)) {
        const full = path.join(wsDir, d);
        const projFile = path.join(full, 'project.json');
        if (fs.statSync(full).isDirectory() && fs.existsSync(projFile)) {
          projects.push(JSON.parse(fs.readFileSync(projFile, 'utf-8')) as Project);
        }
      }
    }
    this.projectsCache.set(ws, projects);
    return projects;
  }

  getProject(ws: string, name: string): Project | undefined {
    return this.getProjects(ws).find(p => p.name === name);
  }

  saveProject(ws: string, project: Project): void {
    const dir = this.projectDir(ws, project.name);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.projectFile(ws, project.name), JSON.stringify(project, null, 2));
    const projects = this.getProjects(ws);
    const idx = projects.findIndex(p => p.name === project.name);
    if (idx >= 0) {
      projects[idx] = project;
    } else {
      projects.push(project);
    }
    this.projectsCache.set(ws, projects);
  }

  deleteProject(ws: string, name: string): boolean {
    const dir = this.projectDir(ws, name);
    if (!fs.existsSync(dir) || !fs.existsSync(this.projectFile(ws, name))) return false;
    fs.rmSync(dir, { recursive: true });
    const projects = this.getProjects(ws).filter(p => p.name !== name);
    this.projectsCache.set(ws, projects);
    const svcKey = `${ws}/${name}`;
    this.servicesCache.delete(svcKey);
    for (const k of [...this.apisCache.keys()]) {
      if (k.startsWith(`${svcKey}/`)) this.apisCache.delete(k);
    }
    this.emit('change');
    return true;
  }

  // --- Services ---

  getServices(ws: string, proj: string): Service[] {
    const key = `${ws}/${proj}`;
    if (this.servicesCache.has(key)) return this.servicesCache.get(key)!;
    const projDir = this.projectDir(ws, proj);
    const services: Service[] = [];
    if (fs.existsSync(projDir)) {
      for (const d of fs.readdirSync(projDir)) {
        const full = path.join(projDir, d);
        const svcFile = path.join(full, 'service.json');
        if (fs.statSync(full).isDirectory() && fs.existsSync(svcFile)) {
          services.push(JSON.parse(fs.readFileSync(svcFile, 'utf-8')) as Service);
        }
      }
    }
    this.servicesCache.set(key, services);
    return services;
  }

  getService(ws: string, proj: string, name: string): Service | undefined {
    return this.getServices(ws, proj).find(s => s.name === name);
  }

  saveService(ws: string, proj: string, service: Service): void {
    const dir = this.serviceDir(ws, proj, service.name);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.serviceFile(ws, proj, service.name), JSON.stringify(service, null, 2));
    const apisF = this.apisFile(ws, proj, service.name);
    if (!fs.existsSync(apisF)) {
      fs.writeFileSync(apisF, '[]');
    }
    const key = `${ws}/${proj}`;
    const services = this.getServices(ws, proj);
    const idx = services.findIndex(s => s.name === service.name);
    if (idx >= 0) {
      services[idx] = service;
    } else {
      services.push(service);
    }
    this.servicesCache.set(key, services);
    this.emit('change');
  }

  deleteService(ws: string, proj: string, name: string): boolean {
    const dir = this.serviceDir(ws, proj, name);
    if (!fs.existsSync(dir) || !fs.existsSync(this.serviceFile(ws, proj, name))) return false;
    fs.rmSync(dir, { recursive: true });
    const key = `${ws}/${proj}`;
    const services = this.getServices(ws, proj).filter(s => s.name !== name);
    this.servicesCache.set(key, services);
    this.apisCache.delete(`${key}/${name}`);
    this.emit('change');
    return true;
  }

  // --- Apis ---

  getApis(ws: string, proj: string, svc: string): StoredApi[] {
    const key = `${ws}/${proj}/${svc}`;
    if (this.apisCache.has(key)) return this.apisCache.get(key)!;
    const file = this.apisFile(ws, proj, svc);
    if (!fs.existsSync(file)) return [];
    const apis = JSON.parse(fs.readFileSync(file, 'utf-8')) as StoredApi[];
    this.apisCache.set(key, apis);
    return apis;
  }

  getApi(ws: string, proj: string, svc: string, name: string): StoredApi | undefined {
    return this.getApis(ws, proj, svc).find(a => a.name === name);
  }

  saveApi(ws: string, proj: string, svc: string, api: StoredApi): void {
    const key = `${ws}/${proj}/${svc}`;
    const apis = this.getApis(ws, proj, svc);
    const idx = apis.findIndex(a => a.name === api.name);
    if (idx >= 0) {
      apis[idx] = api;
    } else {
      apis.push(api);
    }
    this.apisCache.set(key, apis);
    fs.writeFileSync(this.apisFile(ws, proj, svc), JSON.stringify(apis, null, 2));
    this.emit('change');
  }

  deleteApi(ws: string, proj: string, svc: string, name: string): boolean {
    const key = `${ws}/${proj}/${svc}`;
    const apis = this.getApis(ws, proj, svc);
    const idx = apis.findIndex(a => a.name === name);
    if (idx < 0) return false;
    apis.splice(idx, 1);
    this.apisCache.set(key, apis);
    fs.writeFileSync(this.apisFile(ws, proj, svc), JSON.stringify(apis, null, 2));
    this.emit('change');
    return true;
  }
}

export const fileStore = new FileStore();
