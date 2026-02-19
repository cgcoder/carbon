interface RequestLog {
  projectId: string;
  [key: string]: unknown;
}

const MAX_LOGS_PER_PROJECT = 500;

export class LogStore {
  private logs: Map<string, RequestLog[]> = new Map();

  addLog(log: RequestLog): void {
    const projectLogs = this.logs.get(log.projectId) || [];
    projectLogs.push(log);
    // Ring buffer: keep only the last MAX entries
    if (projectLogs.length > MAX_LOGS_PER_PROJECT) {
      projectLogs.shift();
    }
    this.logs.set(log.projectId, projectLogs);
  }

  getLogs(projectId: string): RequestLog[] {
    return (this.logs.get(projectId) || []).slice().reverse();
  }

  clearLogs(projectId: string): void {
    this.logs.delete(projectId);
  }
}

export const logStore = new LogStore();
