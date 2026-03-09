import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LogEntry } from '@carbon/shared';
import { getLogs } from '../api/client';

interface SSEMessage {
  type: 'initial' | 'log' | 'cleared';
  logs?: LogEntry[];
  log?: LogEntry;
}

export function useLogStream() {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Fetch initial logs using react-query
  const { data: initialLogs, isLoading } = useQuery({
    queryKey: ['logs'],
    queryFn: getLogs,
    refetchOnWindowFocus: false,
  });

  // Set initial logs when loaded
  useEffect(() => {
    if (initialLogs) {
      setLogs(initialLogs);
    }
  }, [initialLogs]);

  // Connect to SSE stream
  useEffect(() => {
    const eventSource = new EventSource('/api/logs/stream');

    eventSource.onmessage = (event) => {
      try {
        const message: SSEMessage = JSON.parse(event.data);

        switch (message.type) {
          case 'initial':
            if (message.logs) {
              setLogs(message.logs);
            }
            break;
          case 'log':
            if (message.log) {
              setLogs((prev) => [...prev, message.log!]);
            }
            break;
          case 'cleared':
            setLogs([]);
            break;
        }
      } catch (error) {
        console.error('Failed to parse SSE message:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      // EventSource will automatically try to reconnect
    };

    // Clean up on unmount
    return () => {
      eventSource.close();
    };
  }, []);

  const clearLogs = () => {
    setLogs([]);
  };

  return { logs, isLoading, clearLogs };
}
