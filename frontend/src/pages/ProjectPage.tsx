import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Stack, Group, Title, Text, Button, Badge, ActionIcon, Alert,
  Anchor, Breadcrumbs, Divider,
} from '@mantine/core';
import { Service, Api } from '@carbon/shared';
import { useWorkspace } from '../context/WorkspaceContext';
import CreateApiModal from '../components/CreateApiModal';
import * as api from '../api/client';
import CreateServiceModal from '../components/CreateServiceModal';

interface ServiceWithApis {
  service: Service;
  apis: Api[];
}

const METHOD_COLOR: Record<string, string> = {
  GET: 'green', POST: 'blue', PUT: 'orange', PATCH: 'yellow',
  DELETE: 'red', HEAD: 'gray', OPTIONS: 'violet',
};

export default function ProjectPage() {
  const { projectName } = useParams<{ projectName: string }>();
  const { activeWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const [data, setData] = useState<ServiceWithApis[]>([]);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => {
    if (!projectName) return;
    setError('');
    try {
      const services = await api.getServices(activeWorkspace, projectName);
      const withApis = await Promise.all(
        services.map(async service => ({
          service,
          apis: await api.getApis(activeWorkspace, projectName, service.name),
        }))
      );
      setData(withApis);
    } catch (e: any) {
      setError(e.message);
    }
  }, [activeWorkspace, projectName]);

  useEffect(() => { load(); }, [load]);

  const handleDeleteApi = async (svcName: string, apiName: string) => {
    try {
      await api.deleteApi(activeWorkspace, projectName!, svcName, apiName);
      setData(d =>
        d.map(entry =>
          entry.service.name === svcName
            ? { ...entry, apis: entry.apis.filter(a => a.name !== apiName) }
            : entry
        )
      );
    } catch (e: any) {
      setError(e.message);
    }
  };

  const existingServices = data.map(d => d.service.name);

  return (
    <Stack>
      <Breadcrumbs>
        <Anchor onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>Workspaces</Anchor>
        <Text>{projectName}</Text>
      </Breadcrumbs>

      <Group justify="space-between">
        <Title order={2}>{projectName}</Title>
        <Button onClick={() => setCreateOpen(true)}>New Service</Button>
      </Group>

      {error && <Alert color="red" title="Error" onClose={() => setError('')} withCloseButton>{error}</Alert>}

      {data.length === 0 && (
        <Text c="dimmed">No APIs yet — create one to get started.</Text>
      )}

      {data.map(({ service, apis }) => (
        <Stack key={service.name} gap="xs">
          <Group gap="sm">
            <Text size="sm" fw={600} c="dimmed" tt="uppercase">
              {service.displayName || service.name}
            </Text>
            <Divider style={{ flex: 1 }} />
          </Group>

          {apis.length === 0 && (
            <Text size="sm" c="dimmed" pl="sm">No APIs in this service.</Text>
          )}

          {apis.map(a => (
            <Group
              key={a.name}
              justify="space-between"
              p="sm"
              style={{
                border: '1px solid var(--mantine-color-default-border)',
                borderRadius: 8,
              }}
            >
              <Group gap="sm">
                <Badge color={METHOD_COLOR[a.method] ?? 'gray'} variant="filled" w={72} style={{ textAlign: 'center' }}>
                  {a.method}
                </Badge>
                <Text ff="monospace" size="sm">{a.urlPattern}</Text>
                <Text size="sm" c="dimmed">{a.name}</Text>
              </Group>
              <ActionIcon
                color="red"
                variant="subtle"
                size="sm"
                onClick={() => handleDeleteApi(service.name, a.name)}
                title="Delete API"
              >
                ×
              </ActionIcon>
            </Group>
          ))}
        </Stack>
      ))}

      {createOpen && <CreateServiceModal
        opened={createOpen}
        onClose={() => { setCreateOpen(false); load(); }}
      />}
    </Stack>
  );
}
