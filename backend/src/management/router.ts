import { Router } from 'express';
import activeWorkspaceRoutes from './activeWorkspaceRoutes';
import workspaceRoutes from './workspaceRoutes';
import projectRoutes from './projectRoutes';
import serviceRoutes from './serviceRoutes';
import apiRoutes from './apiRoutes';
import scenarioRoutes from './scenarioRoutes';
import logRoutes from './logRoutes';
import { config } from '../config';

const router = Router();

router.use('/active-workspace', activeWorkspaceRoutes);
router.use('/logs', logRoutes);
router.use('/workspaces', workspaceRoutes);
router.use('/workspaces/:workspace/projects', projectRoutes);
router.use('/workspaces/:workspace/projects/:project/scenarios', scenarioRoutes);
router.use('/workspaces/:workspace/projects/:project/services', serviceRoutes);
router.use('/workspaces/:workspace/projects/:project/services/:service/apis', apiRoutes);
router.use('/config', (req, res) => {
    res.json(config);
});
export default router;
