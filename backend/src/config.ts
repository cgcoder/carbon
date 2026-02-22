import path from 'path';

export const config = {
  mockPort: parseInt(process.env.MOCK_PORT || '3000', 10),
  managementPort: parseInt(process.env.MGMT_PORT || '3001', 10),
  dataDir: process.env.DATA_DIR || path.join(__dirname, '..', 'data'),
  logFile: process.env.LOG_FILE || path.join(__dirname, '..', '..', 'log.txt'),
};
