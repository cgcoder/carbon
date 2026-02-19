import { Router, Request, Response } from 'express';
import { fileStore } from '../storage/FileStore';
import { activeWorkspaceStore } from '../storage/ActiveWorkspaceStore';
import { mockConfigCache } from '../mock/MockConfigCache';

const router = Router();

// GET /active-workspace
router.get('/', (_req: Request, res: Response) => {
  res.json({ workspace: activeWorkspaceStore.get() });
});

// PUT /active-workspace
router.put('/', (req: Request, res: Response) => {
  const { workspace } = req.body;
  if (!workspace || typeof workspace !== 'string') {
    res.status(400).json({ error: 'workspace is required' });
    return;
  }
  if (!fileStore.getWorkspace(workspace)) {
    res.status(404).json({ error: `Workspace "${workspace}" not found` });
    return;
  }
  activeWorkspaceStore.set(workspace);
  mockConfigCache.load();
  res.json({ workspace });
});

export default router;
