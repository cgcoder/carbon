import fs from 'fs';
import { config } from '../config';

export interface MockRequestLogEntry {
  timestamp: string;
  method: string;
  url: string;
  path: string;
  hostname: string;
  body: string | null;
  statusCode: number;
  matched: boolean;
  service?: string;
  project?: string;
  apiName?: string;
  providerName?: string;
  durationMs: number;
}

const MAX_ENTRIES = 500;
const BODY_LIMIT = 100;

class RequestLogger {
  private entries: MockRequestLogEntry[] = [];
  private logStream: fs.WriteStream;

  constructor() {
    this.logStream = fs.createWriteStream(config.logFile, { flags: 'a' });
  }

  log(entry: MockRequestLogEntry): void {
    this.entries.push(entry);
    if (this.entries.length > MAX_ENTRIES) {
      this.entries.shift();
    }
    this.logStream.write(JSON.stringify(entry) + '\n');

    const matchInfo = entry.matched
      ? `${entry.project}/${entry.service}/${entry.apiName}/${entry.providerName}`
      : 'unmatched';
    console.log(`[mock] ${entry.method} ${entry.url} ${entry.statusCode} ${entry.durationMs}ms (${matchInfo})`);
  }

  getEntries(): MockRequestLogEntry[] {
    return [...this.entries];
  }

  truncateBody(body: string | null | undefined): string | null {
    if (body === undefined || body === null || body === '') return null;
    return body.length > BODY_LIMIT ? body.slice(0, BODY_LIMIT) : body;
  }
}

export const requestLogger = new RequestLogger();
