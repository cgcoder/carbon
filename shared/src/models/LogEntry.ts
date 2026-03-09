import { MockRequest } from './MockRequest';
import { ResponseLog } from './ResponseLog';

export interface LogEntry {
    request: MockRequest;
    response: ResponseLog;
    serviceName: string;
    projectName: string;
    workspaceName: string;
}
