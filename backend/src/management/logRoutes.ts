import { Router, Request, Response } from 'express';
import { logStreamInstance } from '../storage/LogStream';
import { LogEntry } from '@carbon/shared';

const router = Router();

// Track active SSE clients
const clients = new Map<string, Response>();
let clientIdCounter = 0;

// GET /logs - Returns all current logs
router.get('/', (_req: Request, res: Response) => {
  const logs = logStreamInstance.getAllLogs();
  res.json(logs);
});

// GET /logs/stream - SSE endpoint for real-time streaming
router.get('/stream', (req: Request, res: Response) => {
  const clientId = `client-${++clientIdCounter}`;

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable buffering for nginx

  // Track this client
  clients.set(clientId, res);

  // Send initial logs immediately
  const initialLogs = logStreamInstance.getAllLogs();
  const initialMessage = {
    type: 'initial',
    logs: initialLogs
  };
  res.write(`data: ${JSON.stringify(initialMessage)}\n\n`);

  // Listen for new log events
  const onLog = (logEntry: LogEntry) => {
    const message = {
      type: 'log',
      log: logEntry
    };
    try {
      res.write(`data: ${JSON.stringify(message)}\n\n`);
    } catch (error) {
      // Client disconnected, will be cleaned up below
    }
  };

  // Listen for clear events
  const onCleared = () => {
    const message = {
      type: 'cleared'
    };
    try {
      res.write(`data: ${JSON.stringify(message)}\n\n`);
    } catch (error) {
      // Client disconnected, will be cleaned up below
    }
  };

  logStreamInstance.on('log', onLog);
  logStreamInstance.on('cleared', onCleared);

  // Keep-alive heartbeat every 30 seconds
  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch (error) {
      clearInterval(heartbeat);
    }
  }, 30000);

  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    logStreamInstance.off('log', onLog);
    logStreamInstance.off('cleared', onCleared);
    clients.delete(clientId);
  });
});

// POST /logs/clear - Clear all logs
router.post('/clear', (_req: Request, res: Response) => {
  logStreamInstance.clearLogs();
  res.json({ success: true });
});

export default router;
