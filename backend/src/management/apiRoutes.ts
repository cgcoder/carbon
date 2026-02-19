import { Router, Request, Response } from 'express';
import { fileStore, StoredApi } from '../storage/FileStore';
import { HttpMethod } from '@carbon/shared';

const router = Router({ mergeParams: true });

// GET / - list APIs in service
router.get('/', (req: Request, res: Response) => {
  const { workspace: ws, project: proj, service: svc } = req.params as Record<string, string>;
  if (!fileStore.getService(ws, proj, svc)) {
    res.status(404).json({ error: `Service "${svc}" not found` });
    return;
  }
  res.json(fileStore.getApis(ws, proj, svc));
});

// POST / - create API
router.post('/', (req: Request, res: Response) => {
  const { workspace: ws, project: proj, service: svc } = req.params as Record<string, string>;
  if (!fileStore.getService(ws, proj, svc)) {
    res.status(404).json({ error: `Service "${svc}" not found` });
    return;
  }
  const { name, description, method, urlPattern, response } = req.body;
  if (!name || typeof name !== 'string') {
    res.status(400).json({ error: 'name is required' });
    return;
  }
  if (!method || !urlPattern || !response) {
    res.status(400).json({ error: 'method, urlPattern, and response are required' });
    return;
  }
  if (fileStore.getApi(ws, proj, svc, name)) {
    res.status(409).json({ error: `Api "${name}" already exists in service "${svc}"` });
    return;
  }
  const api: StoredApi = {
    name,
    description: description || '',
    method: method as HttpMethod,
    urlPattern,
    response,
  };
  fileStore.saveApi(ws, proj, svc, api);
  res.status(201).json(api);
});

// GET /:apiName
router.get('/:apiName', (req: Request, res: Response) => {
  const { workspace: ws, project: proj, service: svc, apiName } = req.params as Record<string, string>;
  const api = fileStore.getApi(ws, proj, svc, apiName);
  if (!api) {
    res.status(404).json({ error: `Api "${apiName}" not found` });
    return;
  }
  res.json(api);
});

// PUT /:apiName - update description, method, urlPattern, response
router.put('/:apiName', (req: Request, res: Response) => {
  if ('name' in req.body) {
    res.status(400).json({ error: 'name cannot be changed' });
    return;
  }
  const { workspace: ws, project: proj, service: svc, apiName } = req.params as Record<string, string>;
  const api = fileStore.getApi(ws, proj, svc, apiName);
  if (!api) {
    res.status(404).json({ error: `Api "${apiName}" not found` });
    return;
  }
  const { description, method, urlPattern, response } = req.body;
  if (description !== undefined) api.description = description;
  if (method !== undefined) api.method = method as HttpMethod;
  if (urlPattern !== undefined) api.urlPattern = urlPattern;
  if (response !== undefined) api.response = response;
  fileStore.saveApi(ws, proj, svc, api);
  res.json(api);
});

// DELETE /:apiName
router.delete('/:apiName', (req: Request, res: Response) => {
  const { workspace: ws, project: proj, service: svc, apiName } = req.params as Record<string, string>;
  if (!fileStore.deleteApi(ws, proj, svc, apiName)) {
    res.status(404).json({ error: `Api "${apiName}" not found` });
    return;
  }
  res.status(204).send();
});

export default router;
