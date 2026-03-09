import { MockRequest, ResponseLog } from "@carbon/shared";
import { ResponseWrapper } from "../mock/ResponseWrapper";
import { EventEmitter } from 'events';

export interface LogEntry {
    request: MockRequest;
    response: ResponseLog;
    serviceName: string;
    projectName: string;
    workspaceName: string;
}

export class LogStream extends EventEmitter {
    private index: number = 0;
    private logs: LogEntry[] = [];

    addRequestResponse(
        request: MockRequest,
        response: ResponseWrapper,
        serviceName: string,
        projectName: string,
        workspaceName: string
    ): void {
        // For simplicity, we just log the method and URL. In a real implementation, you might want to log headers, body, etc.

        const responseLog: ResponseLog = {
            status: response.response().statusCode,
            headers: response.response().getHeaders() as Record<string, string | number | string[]>,
            body: response.responseBodyString(),
        };

        const logEntry: LogEntry = {
            request,
            response: responseLog,
            serviceName,
            projectName,
            workspaceName
        };
        this.logs.push(logEntry);
        if (this.logs.length > 200) {
            this.logs.shift();
        }

        // Emit event for SSE listeners
        this.emit('log', logEntry);
    }

    getAllLogs(): LogEntry[] {
        return [...this.logs]; // Return copy to prevent mutation
    }

    clearLogs(): void {
        this.logs = [];
        this.emit('cleared');
    }
}



export const logStreamInstance: LogStream = new LogStream();