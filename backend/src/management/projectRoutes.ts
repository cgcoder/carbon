import { Router, Request, Response } from 'express';
import { fileStore } from '../storage/FileStore';
import { Project } from '@carbon/shared';

const router = Router({ mergeParams: true });

const NAME_PATTERN = /^[\w. ]+$/;

// GET / - list projects in workspace
router.get('/', (req: Request, res: Response) => {
  const { workspace: ws } = req.params as Record<string, string>;
  if (!fileStore.getWorkspace(ws)) {
    res.status(404).json({ error: `Workspace "${ws}" not found` });
    return;
  }
  res.json(fileStore.getProjects(ws));
});

// POST / - create project
router.post('/', (req: Request, res: Response) => {
  const { workspace: ws } = req.params as Record<string, string>;
  if (!fileStore.getWorkspace(ws)) {
    res.status(404).json({ error: `Workspace "${ws}" not found` });
    return;
  }
  const { name, displayName, description } = req.body;
  if (!name || typeof name !== 'string' || !NAME_PATTERN.test(name)) {
    res.status(400).json({ error: 'name is required and must match /^[\\w. ]+$/' });
    return;
  }
  if (fileStore.getProject(ws, name)) {
    res.status(409).json({ error: `Project "${name}" already exists in workspace "${ws}"` });
    return;
  }
  const project: Project = {
    name,
    displayName: displayName || name,
    description: description || '',
    workspace: ws,
  };
  fileStore.saveProject(ws, project);
  res.status(201).json(project);
});

// GET /:project
router.get('/:project', (req: Request, res: Response) => {
  const { workspace: ws, project: projName } = req.params as Record<string, string>;
  const project = fileStore.getProject(ws, projName);
  if (!project) {
    res.status(404).json({ error: `Project "${projName}" not found` });
    return;
  }
  res.json(project);
});

// PUT /:project - update displayName, description only
router.put('/:project', (req: Request, res: Response) => {
  if ('name' in req.body) {
    res.status(400).json({ error: 'name cannot be changed' });
    return;
  }
  const { workspace: ws, project: projName } = req.params as Record<string, string>;
  const project = fileStore.getProject(ws, projName);
  if (!project) {
    res.status(404).json({ error: `Project "${projName}" not found` });
    return;
  }
  const { displayName, description } = req.body;
  if (displayName !== undefined) project.displayName = displayName;
  if (description !== undefined) project.description = description;
  fileStore.saveProject(ws, project);
  res.json(project);
});

// DELETE /:project - cascading delete
router.delete('/:project', (req: Request, res: Response) => {
  const { workspace: ws, project: projName } = req.params as Record<string, string>;
  if (!fileStore.deleteProject(ws, projName)) {
    res.status(404).json({ error: `Project "${projName}" not found` });
    return;
  }
  res.status(204).send();
});

export default router;
