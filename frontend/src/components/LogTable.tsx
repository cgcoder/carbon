import { useState } from 'react';
import { RequestLog } from '../types';

interface Props {
  logs: RequestLog[];
}

export default function LogTable({ logs }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (logs.length === 0) {
    return <p className="empty">No request logs yet.</p>;
  }

  return (
    <div className="log-table">
      <table>
        <thead>
          <tr>
            <th>Time</th>
            <th>Method</th>
            <th>Path</th>
            <th>Status</th>
            <th>Duration</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <>
              <tr
                key={log.id}
                className="log-row"
                onClick={() => setExpanded(expanded === log.id ? null : log.id)}
              >
                <td>{new Date(log.timestamp).toLocaleTimeString()}</td>
                <td><span className="method-badge-sm">{log.method}</span></td>
                <td>{log.path}</td>
                <td className={log.responseStatus >= 400 ? 'status-error' : 'status-ok'}>
                  {log.responseStatus}
                </td>
                <td>{log.duration}ms</td>
              </tr>
              {expanded === log.id && (
                <tr key={`${log.id}-detail`} className="log-detail">
                  <td colSpan={5}>
                    <div className="log-detail-content">
                      <div>
                        <strong>Request Headers:</strong>
                        <pre>{JSON.stringify(log.headers, null, 2)}</pre>
                      </div>
                      {log.body && (
                        <div>
                          <strong>Request Body:</strong>
                          <pre>{log.body}</pre>
                        </div>
                      )}
                      <div>
                        <strong>Response Body:</strong>
                        <pre>{log.responseBody}</pre>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}
