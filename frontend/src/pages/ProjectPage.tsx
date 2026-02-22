import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Stack, SimpleGrid, Card, Group, Title, Text, Button, Alert,
  Anchor, Breadcrumbs, Badge, Divider,
} from '@mantine/core';
import { Service } from '@carbon/shared';
import { useWorkspace } from '../context/WorkspaceContext';
import CreateServiceModal from '../components/CreateServiceModal';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import * as api from '../api/client';

export default function ProjectPage() {
  const { projectName } = useParams<{ projectName: string }>();
  const { activeWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editService, setEditService] = useState<Service | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const servicesKey = ['services', activeWorkspace, projectName];

  const { data: services = [], error } = useQuery({
    queryKey: servicesKey,
    queryFn: () => api.getServices(activeWorkspace, projectName!),
    enabled: !!projectName,
  });

  const deleteMutation = useMutation({
    mutationFn: (name: string) => api.deleteService(activeWorkspace, projectName!, name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: servicesKey }),
  });

  const toggleMutation = useMutation({
    mutationFn: (s: Service) =>
      api.updateService(activeWorkspace, projectName!, s.name, { enabled: s.enabled !== false ? false : true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: servicesKey }),
  });

  const handleEdit = (service: Service, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditService(service);
  };

  const handleDelete = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPendingDelete(name);
  };

  const handleToggle = (s: Service, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleMutation.mutate(s);
  };

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

      {(error || deleteMutation.error) && (
        <Alert color="red" title="Error" withCloseButton>
          {((error || deleteMutation.error) as Error).message}
        </Alert>
      )}

      {services.length === 0 ? (
        <Text c="dimmed">No services yet — create one to get started.</Text>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
          {services.map(s => (
            <Card
              key={s.name}
              withBorder
              style={{
                cursor: 'pointer',
                opacity: s.enabled === false ? 0.65 : 1,
                borderColor: s.enabled === false ? 'var(--mantine-color-gray-4)' : undefined,
              }}
              onClick={() => navigate(`/projects/${encodeURIComponent(projectName!)}/services/${encodeURIComponent(s.name)}`)}
            >
              <Group justify="space-between" mb="xs" wrap="nowrap">
                <Text fw={600} truncate>{s.displayName || s.name}</Text>
                <Badge
                  size="sm"
                  color={s.enabled === false ? 'gray' : 'green'}
                  variant={s.enabled === false ? 'outline' : 'light'}
                >
                  {s.enabled === false ? 'Disabled' : 'Enabled'}
                </Badge>
              </Group>
              {s.description && (
                <Text c="dimmed" size="sm" lineClamp={2} mb="xs">{s.description}</Text>
              )}
              {s.hostname && (
                <Text size="xs" ff="monospace" c="dimmed">{s.hostname}</Text>
              )}
              {s.injectLatencyMs ? (
                <Badge size="xs" variant="light" mt="xs">+{s.injectLatencyMs}ms latency</Badge>
              ) : null}
              <Divider mt="sm" mb="xs" />
              <Group gap="xs" wrap="nowrap" onClick={e => e.stopPropagation()}>
                <Button
                  variant="light"
                  size="xs"
                  color={s.enabled === false ? 'green' : 'gray'}
                  onClick={e => handleToggle(s, e)}
                >
                  {s.enabled === false ? 'Enable' : 'Disable'}
                </Button>
                <Button
                  variant="light"
                  size="xs"
                  onClick={e => handleEdit(s, e)}
                >
                  Edit
                </Button>
                <Button
                  variant="light"
                  size="xs"
                  color="red"
                  onClick={e => handleDelete(s.name, e)}
                >
                  Delete
                </Button>
              </Group>
            </Card>
          ))}
        </SimpleGrid>
      )}

      {createOpen && (
        <CreateServiceModal
          opened={createOpen}
          onClose={() => setCreateOpen(false)}
        />
      )}

      {editService && (
        <CreateServiceModal
          opened={!!editService}
          service={editService}
          onClose={() => setEditService(null)}
        />
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
