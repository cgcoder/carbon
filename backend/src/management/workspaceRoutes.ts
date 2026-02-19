import { Router, Request, Response } from 'express';
import { fileStore } from '../storage/FileStore';
import { Workspace } from '@carbon/shared';

const router = Router();

// GET / - list all workspaces
router.get('/', (_req: Request, res: Response) => {
  res.json(fileStore.getWorkspaces());
});

// POST / - create workspace
router.post('/', (req: Request, res: Response) => {
  const { name, displayName, description } = req.body;
  if (!name || typeof name !== 'string' || name.includes('/') || name.includes('\\')) {
    res.status(400).json({ error: 'name is required and must not contain / or \\' });
    return;
  }
  if (fileStore.getWorkspace(name)) {
    res.status(409).json({ error: `Workspace "${name}" already exists` });
    return;
  }
  const ws: Workspace = {
    name,
    displayName: displayName || name,
    description: description || '',
  };
  fileStore.saveWorkspace(ws);
  res.status(201).json(ws);
});

// GET /:workspace
router.get('/:workspace', (req: Request, res: Response) => {
  const wsName = req.params.workspace as string;
  const ws = fileStore.getWorkspace(wsName);
  if (!ws) {
    res.status(404).json({ error: `Workspace "${wsName}" not found` });
    return;
  }
  res.json(ws);
});

// PUT /:workspace - update displayName, description only
router.put('/:workspace', (req: Request, res: Response) => {
  if ('name' in req.body) {
    res.status(400).json({ error: 'name cannot be changed' });
    return;
  }
  const wsName = req.params.workspace as string;
  const ws = fileStore.getWorkspace(wsName);
  if (!ws) {
    res.status(404).json({ error: `Workspace "${wsName}" not found` });
    return;
  }
  const { displayName, description } = req.body;
  if (displayName !== undefined) ws.displayName = displayName;
  if (description !== undefined) ws.description = description;
  fileStore.saveWorkspace(ws);
  res.json(ws);
});

// DELETE /:workspace - cascading delete
router.delete('/:workspace', (req: Request, res: Response) => {
  const wsName = req.params.workspace as string;
  if (!fileStore.deleteWorkspace(wsName)) {
    res.status(404).json({ error: `Workspace "${wsName}" not found` });
    return;
  }
  res.status(204).send();
});

export default router;
