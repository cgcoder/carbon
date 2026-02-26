import { Router, Request, Response } from 'express';
import { fileStore } from '../storage/FileStore';
import { DEFAULT_SCENARIO_ID, ProjectScenario } from '@carbon/shared';

const router = Router({ mergeParams: true });

// POST / - create scenario
router.post('/', (req: Request, res: Response) => {
  const { workspace: ws, project: projName } = req.params as Record<string, string>;
  const project = fileStore.getProject(ws, projName);
  if (!project) {
    res.status(404).json({ error: `Project "${projName}" not found` });
    return;
  }
  const { name, description } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ error: 'name is required' });
    return;
  }
  const scenario: ProjectScenario = {
    id: Date.now().toString(),
    name: name.trim(),
    description: description || '',
  };
  if (!project.scenarios) {
    project.scenarios = [];
  }
  project.scenarios.push(scenario);
  fileStore.saveProject(ws, project);
  res.status(201).json(scenario);
});

// PUT /:scenarioId - update scenario
router.put('/:scenarioId', (req: Request, res: Response) => {
  const { workspace: ws, project: projName, scenarioId } = req.params as Record<string, string>;
  if (scenarioId === DEFAULT_SCENARIO_ID) {
    res.status(400).json({ error: 'Cannot modify the Default scenario' });
    return;
  }
  const project = fileStore.getProject(ws, projName);
  if (!project) {
    res.status(404).json({ error: `Project "${projName}" not found` });
    return;
  }
  const scenario = project.scenarios?.find(s => s.id === scenarioId);
  if (!scenario) {
    res.status(404).json({ error: `Scenario "${scenarioId}" not found` });
    return;
  }
  const { name, description } = req.body;
  if (name !== undefined) scenario.name = name;
  if (description !== undefined) scenario.description = description;
  fileStore.saveProject(ws, project);
  res.json(scenario);
});

// DELETE /:scenarioId - delete scenario
router.delete('/:scenarioId', (req: Request, res: Response) => {
  const { workspace: ws, project: projName, scenarioId } = req.params as Record<string, string>;
  if (scenarioId === DEFAULT_SCENARIO_ID) {
    res.status(400).json({ error: 'Cannot delete the Default scenario' });
    return;
  }
  const project = fileStore.getProject(ws, projName);
  if (!project) {
    res.status(404).json({ error: `Project "${projName}" not found` });
    return;
  }
  const idx = project.scenarios?.findIndex(s => s.id === scenarioId) ?? -1;
  if (idx === -1) {
    res.status(404).json({ error: `Scenario "${scenarioId}" not found` });
    return;
  }
  project.scenarios!.splice(idx, 1);
  fileStore.saveProject(ws, project);
  res.status(204).send();
});

export default router;
