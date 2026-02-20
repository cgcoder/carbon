import express from 'express';
import cors from 'cors';
import { config } from './config';
import { fileStore } from './storage/FileStore';
import { mockConfigCache } from './mock/MockConfigCache';
import managementRouter from './management/router';
import mockRouter from './mock/router';

// Initialize storage and load mock config cache
fileStore.init();
mockConfigCache.load();
fileStore.on('change', () => mockConfigCache.load());

// --- Management API (port 3001) ---
const managementApp = express();
managementApp.use(cors());
managementApp.use(express.json({ limit: '30mb' }));
managementApp.use('/api', managementRouter);

managementApp.listen(config.managementPort, () => {
  console.log(`[Carbon] Management API running on http://localhost:${config.managementPort}`);
});

// --- Mock Server (port 3000) ---
const mockApp = express();
mockApp.use(express.json({ limit: '70mb' }));
mockApp.use(express.text());
mockApp.use(express.urlencoded({ extended: true }));
mockApp.use(mockRouter);

mockApp.listen(config.mockPort, () => {
  console.log(`[Carbon] Mock server running on http://localhost:${config.mockPort}`);
});
