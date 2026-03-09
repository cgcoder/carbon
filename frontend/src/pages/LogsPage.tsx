import {
  Stack, Group, Title, Text, Button, Badge, Accordion, Code, ScrollArea, Box, MultiSelect,
} from '@mantine/core';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLogStream } from '../hooks/useLogStream';
import { useWorkspace } from '../context/WorkspaceContext';
import { getProjects, getServices } from '../api/client';

function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString();
}

function getStatusColor(status: number): string {
  if (status >= 200 && status < 300) return 'green';
  if (status >= 400 && status < 500) return 'yellow';
  if (status >= 500) return 'red';
  return 'gray';
}

function formatHeaders(headers: Record<string, string | number | string[]>): string {
  return JSON.stringify(headers, null, 2);
}

function formatBody(body: string): string {
  try {
    const parsed = JSON.parse(body);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return body;
  }
}

export default function LogsPage() {
  const { logs, isLoading, clearLogs } = useLogStream();
  const { activeWorkspace } = useWorkspace();
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [hiddenServices, setHiddenServices] = useState<string[]>([]);

  // Fetch all projects in the active workspace
  const { data: projects = [] } = useQuery({
    queryKey: ['projects', activeWorkspace],
    queryFn: () => getProjects(activeWorkspace),
    enabled: !!activeWorkspace,
  });

  // Fetch all services from all projects
  const { data: allServices = [] } = useQuery({
    queryKey: ['allServices', activeWorkspace, projects.map(p => p.name)],
    queryFn: async () => {
      const servicePromises = projects.map(project =>
        getServices(activeWorkspace, project.name)
      );
      const servicesArrays = await Promise.all(servicePromises);
      return servicesArrays.flat();
    },
    enabled: !!activeWorkspace && projects.length > 0,
  });

  // Create service options for the dropdown
  const serviceOptions = useMemo(() => {
    return allServices.map(service => ({
      value: service.name,
      label: service.displayName || service.name,
    }));
  }, [allServices]);

  // Filter logs based on selected and hidden services
  const filteredLogs = useMemo(() => {
    let result = logs;
    if (selectedServices.length > 0) {
      result = result.filter(log => selectedServices.includes(log.serviceName));
    }
    if (hiddenServices.length > 0) {
      result = result.filter(log => !hiddenServices.includes(log.serviceName));
    }
    return result;
  }, [logs, selectedServices, hiddenServices]);

  if (isLoading) {
    return (
      <Stack>
        <Title order={2}>Request Logs</Title>
        <Text c="dimmed">Loading logs...</Text>
      </Stack>
    );
  }

  return (
    <Stack>
      <Group justify="space-between">
        <Group>
          <Title order={2}>Request Logs</Title>
          <Badge size="lg" variant="light">
            {filteredLogs.length} {filteredLogs.length === 1 ? 'request' : 'requests'}
          </Badge>
        </Group>
        <Button variant="light" color="red" onClick={clearLogs}>
          Clear Logs
        </Button>
      </Group>

      <Group grow>
        <MultiSelect
          label="Show Logs From Service"
          placeholder={selectedServices.length === 0 ? "All services" : "Select services"}
          data={serviceOptions}
          value={selectedServices}
          onChange={setSelectedServices}
          searchable
          clearable
          description={selectedServices.length === 0 ? "Showing logs from all services" : `Showing logs from ${selectedServices.length} selected service${selectedServices.length === 1 ? '' : 's'}`}
        />
        <MultiSelect
          label="Hide Logs From Service"
          placeholder={hiddenServices.length === 0 ? "All services" : "Select services"}
          data={serviceOptions}
          value={hiddenServices}
          onChange={setHiddenServices}
          searchable
          clearable
          description={hiddenServices.length === 0 ? "Not hidding logs" : `Hiding logs from ${hiddenServices.length} selected service${hiddenServices.length === 1 ? '' : 's'}`}
        />
      </Group>

      {filteredLogs.length === 0 ? (
        <Text c="dimmed">
          {logs.length === 0
            ? "No requests logged yet. Make a request to the mock server on port 3000 to see logs appear here."
            : "No logs match the selected service filter."}
        </Text>
      ) : (
        <Accordion variant="separated">
          {filteredLogs.map((logEntry, index) => {
            const { request, response } = logEntry;
            const key = `${index}-${request.timestamp}`;

            return (
              <Accordion.Item key={key} value={key}>
                <Accordion.Control>
                  <Group gap="xs" wrap="nowrap">
                    <Badge size="sm" variant="light" color="gray">
                      {formatTimestamp(request.timestamp)}
                    </Badge>
                    <Badge size="sm" variant="light" color="violet">
                      {logEntry.serviceName}
                    </Badge>
                    <Badge size="sm" variant="light" color="blue">
                      {request.method}
                    </Badge>
                    <Text size="sm" truncate style={{ flex: 1 }}>
                      {request.url}
                    </Text>
                    <Badge size="sm" variant="filled" color={getStatusColor(response.status)}>
                      {response.status}
                    </Badge>
                  </Group>
                </Accordion.Control>

                <Accordion.Panel>
                  <Stack gap="md">
                    {/* Request Section */}
                    <Box>
                      <Text fw={600} mb="xs">Request</Text>
                      <Stack gap="xs">
                        <Group gap="xs">
                          <Text size="sm" fw={500} w={100}>Method:</Text>
                          <Badge size="sm" variant="light">{request.method}</Badge>
                        </Group>

                        <Group gap="xs">
                          <Text size="sm" fw={500} w={100}>URL:</Text>
                          <Code>{request.url}</Code>
                        </Group>

                        {request.hostname && (
                          <Group gap="xs">
                            <Text size="sm" fw={500} w={100}>Hostname:</Text>
                            <Code>{request.hostname}</Code>
                          </Group>
                        )}

                        <Group gap="xs" align="flex-start">
                          <Text size="sm" fw={500} w={100}>Headers:</Text>
                          <ScrollArea.Autosize mah={150} style={{ flex: 1 }}>
                            <Code block>{formatHeaders(request.headers)}</Code>
                          </ScrollArea.Autosize>
                        </Group>

                        {request.queryParameters && Object.keys(request.queryParameters).length > 0 && (
                          <Group gap="xs" align="flex-start">
                            <Text size="sm" fw={500} w={100}>Query Params:</Text>
                            <ScrollArea.Autosize mah={150} style={{ flex: 1 }}>
                              <Code block>{JSON.stringify(request.queryParameters, null, 2)}</Code>
                            </ScrollArea.Autosize>
                          </Group>
                        )}

                        {request.body && (
                          <Group gap="xs" align="flex-start">
                            <Text size="sm" fw={500} w={100}>Body:</Text>
                            <ScrollArea.Autosize mah={300} style={{ flex: 1 }}>
                              <Code block>{formatBody(request.body)}</Code>
                            </ScrollArea.Autosize>
                          </Group>
                        )}
                      </Stack>
                    </Box>

                    {/* Response Section */}
                    <Box>
                      <Text fw={600} mb="xs">Response</Text>
                      <Stack gap="xs">
                        <Group gap="xs">
                          <Text size="sm" fw={500} w={100}>Status:</Text>
                          <Badge size="sm" variant="filled" color={getStatusColor(response.status)}>
                            {response.status}
                          </Badge>
                        </Group>

                        <Group gap="xs" align="flex-start">
                          <Text size="sm" fw={500} w={100}>Headers:</Text>
                          <ScrollArea.Autosize mah={150} style={{ flex: 1 }}>
                            <Code block>{formatHeaders(response.headers)}</Code>
                          </ScrollArea.Autosize>
                        </Group>

                        {response.body && (
                          <Group gap="xs" align="flex-start">
                            <Text size="sm" fw={500} w={100}>Body:</Text>
                            <ScrollArea.Autosize mah={300} style={{ flex: 1 }}>
                              <Code block>{formatBody(response.body)}</Code>
                            </ScrollArea.Autosize>
                          </Group>
                        )}
                      </Stack>
                    </Box>
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>
            );
          })}
        </Accordion>
      )}
    </Stack>
  );
}
