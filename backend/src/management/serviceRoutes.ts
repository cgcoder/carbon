import { Router, Request, Response } from 'express';
import { fileStore } from '../storage/FileStore';
import { Service } from '@carbon/shared';

const router = Router({ mergeParams: true });

// GET / - list services in project
router.get('/', (req: Request, res: Response) => {
  const { workspace: ws, project: proj } = req.params as Record<string, string>;
  if (!fileStore.getProject(ws, proj)) {
    res.status(404).json({ error: `Project "${proj}" not found` });
    return;
  }
  res.json(fileStore.getServices(ws, proj));
});

// POST / - create service
router.post('/', (req: Request, res: Response) => {
  const { workspace: ws, project: proj } = req.params as Record<string, string>;
  if (!fileStore.getProject(ws, proj)) {
    res.status(404).json({ error: `Project "${proj}" not found` });
    return;
  }
  const { name, displayName, description, hostname, matchHostName, injectLatencyMs, urlPrefix } = req.body;
  if (!name || typeof name !== 'string' || name.includes('/') || name.includes('\\')) {
    res.status(400).json({ error: 'name is required and must not contain / or \\' });
    return;
  }
  if (fileStore.getService(ws, proj, name)) {
    res.status(409).json({ error: `Service "${name}" already exists` });
    return;
  }
  const service: Service = {
    name,
    displayName: displayName || name,
    description: description || '',
    ...(hostname !== undefined && { hostname }),
    ...(matchHostName !== undefined && { matchHostName }),
    ...(injectLatencyMs !== undefined && { injectLatencyMs }),
    ...(urlPrefix !== undefined && { urlPrefix }),
  };
  fileStore.saveService(ws, proj, service);
  res.status(201).json(service);
});

// GET /:service
router.get('/:service', (req: Request, res: Response) => {
  const { workspace: ws, project: proj, service: svcName } = req.params as Record<string, string>;
  const service = fileStore.getService(ws, proj, svcName);
  if (!service) {
    res.status(404).json({ error: `Service "${svcName}" not found` });
    return;
  }
  res.json(service);
});

// PATCH /:service - partially update service fields (name is immutable)
router.patch('/:service', (req: Request, res: Response) => {
  if ('name' in req.body) {
    res.status(400).json({ error: 'name cannot be changed' });
    return;
  }
  const { workspace: ws, project: proj, service: svcName } = req.params as Record<string, string>;
  const service = fileStore.getService(ws, proj, svcName);
  if (!service) {
    res.status(404).json({ error: `Service "${svcName}" not found` });
    return;
  }
  const { displayName, description, hostname, matchHostName, injectLatencyMs, urlPrefix, enabled } = req.body;
  if (displayName !== undefined) service.displayName = displayName;
  if (description !== undefined) service.description = description;
  if (hostname !== undefined) service.hostname = hostname;
  if (matchHostName !== undefined) service.matchHostName = matchHostName;
  if (injectLatencyMs !== undefined) service.injectLatencyMs = injectLatencyMs;
  if (urlPrefix !== undefined) service.urlPrefix = urlPrefix;
  if (enabled !== undefined) service.enabled = enabled;
  fileStore.saveService(ws, proj, service);
  res.json(service);
});

// DELETE /:service - cascading delete
router.delete('/:service', (req: Request, res: Response) => {
  const { workspace: ws, project: proj, service: svcName } = req.params as Record<string, string>;
  if (!fileStore.deleteService(ws, proj, svcName)) {
    res.status(404).json({ error: `Service "${svcName}" not found` });
    return;
  }
  res.status(204).send();
});

export default router;
