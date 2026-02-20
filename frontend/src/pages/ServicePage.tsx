import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Stack, Group, Title, Text, Button, ActionIcon, Alert,
  Anchor, Breadcrumbs, Table, Badge, Menu,
} from '@mantine/core';
import { Api, ResponseProviderConfig } from '@carbon/shared';
import { useWorkspace } from '../context/WorkspaceContext';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import * as api from '../api/client';

const METHOD_COLORS: Record<string, string> = {
  GET: 'green', POST: 'blue', PUT: 'orange', PATCH: 'yellow',
  DELETE: 'red', HEAD: 'gray', OPTIONS: 'violet',
};

const PROVIDER_LABELS: Record<ResponseProviderConfig['type'], string> = {
  static: 'Static',
  script: 'Script',
  template: 'Template',
  proxy: 'Proxy',
  scenario: 'Scenario',
};

export default function ServicePage() {
  const { projectName, serviceName } = useParams<{ projectName: string; serviceName: string }>();
  const { activeWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const apisKey = ['apis', activeWorkspace, projectName, serviceName];

  const { data: apis = [], error } = useQuery({
    queryKey: apisKey,
    queryFn: () => api.getApis(activeWorkspace, projectName!, serviceName!),
    enabled: !!projectName && !!serviceName,
  });

  const deleteMutation = useMutation({
    mutationFn: (name: string) => api.deleteApi(activeWorkspace, projectName!, serviceName!, name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: apisKey }),
  });

  const newApiPath = (type: ResponseProviderConfig['type']) =>
    `/projects/${encodeURIComponent(projectName!)}/services/${encodeURIComponent(serviceName!)}/apis/new?type=${type}`;

  const editApiPath = (a: Api) =>
    `/projects/${encodeURIComponent(projectName!)}/services/${encodeURIComponent(serviceName!)}/apis/${encodeURIComponent(a.name)}/edit`;

  return (
    <Stack>
      <Breadcrumbs>
        <Anchor onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>Workspaces</Anchor>
        <Anchor onClick={() => navigate(`/projects/${encodeURIComponent(projectName!)}`)} style={{ cursor: 'pointer' }}>
          {projectName}
        </Anchor>
        <Text>{serviceName}</Text>
      </Breadcrumbs>

      <Group justify="space-between">
        <Title order={2}>{serviceName}</Title>
        <Menu position="bottom-end">
          <Menu.Target>
            <Button>New API ▾</Button>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>Response Provider</Menu.Label>
            <Menu.Item onClick={() => navigate(newApiPath('static'))}>Static</Menu.Item>
            <Menu.Item onClick={() => navigate(newApiPath('script'))}>Script</Menu.Item>
            <Menu.Item onClick={() => navigate(newApiPath('template'))}>Template</Menu.Item>
            <Menu.Item onClick={() => navigate(newApiPath('proxy'))}>Proxy</Menu.Item>
            <Menu.Item onClick={() => navigate(newApiPath('scenario'))}>Scenario</Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>

      {(error || deleteMutation.error) && (
        <Alert color="red" title="Error" withCloseButton>
          {((error || deleteMutation.error) as Error).message}
        </Alert>
      )}

      {apis.length === 0 ? (
        <Text c="dimmed">No APIs yet — create one to get started.</Text>
      ) : (
        <Table striped highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Method</Table.Th>
              <Table.Th>Name</Table.Th>
              <Table.Th>URL Pattern</Table.Th>
              <Table.Th>Provider</Table.Th>
              <Table.Th>Description</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {apis.map(a => (
              <Table.Tr key={a.name}>
                <Table.Td>
                  <Badge color={METHOD_COLORS[a.method] ?? 'gray'} variant="filled" size="sm">
                    {a.method}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" fw={500}>{a.name}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" ff="monospace" c="dimmed">{a.urlPattern}</Text>
                </Table.Td>
                <Table.Td>
                  <Badge variant="light" size="sm">{PROVIDER_LABELS[a.response.type]}</Badge>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed">{a.description || '—'}</Text>
                </Table.Td>
                <Table.Td>
                  <Group gap={4} wrap="nowrap" justify="flex-end">
                    <ActionIcon
                      variant="subtle"
                      size="sm"
                      onClick={() => navigate(editApiPath(a), { state: { api: a } })}
                      title="Edit API"
                    >
                      ✎
                    </ActionIcon>
                    <ActionIcon
                      color="red"
                      variant="subtle"
                      size="sm"
                      onClick={() => setPendingDelete(a.name)}
                      title="Delete API"
                    >
                      ×
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}

      <ConfirmDeleteModal
        opened={!!pendingDelete}
        entityName={pendingDelete ?? ''}
        onConfirm={() => deleteMutation.mutate(pendingDelete!)}
        onClose={() => setPendingDelete(null)}
      />
    </Stack>
  );
}
