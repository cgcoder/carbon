import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Stack, SimpleGrid, Card, Group, Title, Text, Button, Alert,
  Anchor, Breadcrumbs, Badge, Divider, ActionIcon,
} from '@mantine/core';
import { Service, ProjectScenario, DEFAULT_SCENARIO_ID } from '@carbon/shared';
import { useWorkspace } from '../context/WorkspaceContext';
import CreateServiceModal from '../components/CreateServiceModal';
import CreateScenarioModal from '../components/CreateScenarioModal';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import * as api from '../api/client';

export default function ProjectPage() {
  const { projectName } = useParams<{ projectName: string }>();
  const { activeWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [createServiceOpen, setCreateServiceOpen] = useState(false);
  const [editService, setEditService] = useState<Service | null>(null);
  const [pendingDeleteService, setPendingDeleteService] = useState<string | null>(null);
  const [scenarioModalOpen, setScenarioModalOpen] = useState(false);
  const [editScenario, setEditScenario] = useState<ProjectScenario | null>(null);
  const [pendingDeleteScenario, setPendingDeleteScenario] = useState<string | null>(null);

  const servicesKey = ['services', activeWorkspace, projectName];
  const projectKey = ['project', activeWorkspace, projectName];

  const { data: services = [], error: servicesError } = useQuery({
    queryKey: servicesKey,
    queryFn: () => api.getServices(activeWorkspace, projectName!),
    enabled: !!projectName,
  });

  const { data: project } = useQuery({
    queryKey: projectKey,
    queryFn: () => api.getProject(activeWorkspace, projectName!),
    enabled: !!projectName,
  });

  const scenarios = project?.scenarios ?? [];

  const deleteServiceMutation = useMutation({
    mutationFn: (name: string) => api.deleteService(activeWorkspace, projectName!, name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: servicesKey }),
  });

  const toggleMutation = useMutation({
    mutationFn: (s: Service) =>
      api.updateService(activeWorkspace, projectName!, s.name, { enabled: s.enabled !== false ? false : true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: servicesKey }),
  });

  const deleteScenarioMutation = useMutation({
    mutationFn: (id: string) => api.deleteScenario(activeWorkspace, projectName!, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKey }),
  });

  const handleEditService = (service: Service, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditService(service);
  };

  const handleDeleteService = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPendingDeleteService(name);
  };

  const handleToggle = (s: Service, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleMutation.mutate(s);
  };

  const handleOpenScenarioModal = (scenario?: ProjectScenario) => {
    setEditScenario(scenario ?? null);
    setScenarioModalOpen(true);
  };

  const handleCloseScenarioModal = () => {
    setScenarioModalOpen(false);
    setEditScenario(null);
  };

  return (
    <Stack>
      <Breadcrumbs>
        <Anchor onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>Workspaces</Anchor>
        <Text>{projectName}</Text>
      </Breadcrumbs>

      <Group justify="space-between">
        <Title order={2}>{projectName}</Title>
      </Group>

      {(servicesError || deleteServiceMutation.error) && (
        <Alert color="red" title="Error" withCloseButton>
          {((servicesError || deleteServiceMutation.error) as Error).message}
        </Alert>
      )}

      {/* Scenarios section */}
      <Stack gap="xs">
        <Group justify="space-between" align="center">
          <Title order={4}>Scenarios</Title>
          <Button size="xs" onClick={() => handleOpenScenarioModal()}>New Scenario</Button>
        </Group>
        <Group gap="xs" wrap="wrap">
          {scenarios.map(scenario => (
            <Badge
              key={scenario.id}
              variant={scenario.id === DEFAULT_SCENARIO_ID ? 'filled' : 'light'}
              size="lg"
              pr={scenario.id === DEFAULT_SCENARIO_ID ? undefined : 4}
              rightSection={
                scenario.id !== DEFAULT_SCENARIO_ID ? (
                  <Group gap={2} wrap="nowrap">
                    <ActionIcon
                      size="xs"
                      variant="transparent"
                      color="currentColor"
                      onClick={() => handleOpenScenarioModal(scenario)}
                      aria-label="Edit scenario"
                    >
                      ✏
                    </ActionIcon>
                    <ActionIcon
                      size="xs"
                      variant="transparent"
                      color="currentColor"
                      onClick={() => setPendingDeleteScenario(scenario.id)}
                      aria-label="Delete scenario"
                    >
                      ✕
                    </ActionIcon>
                  </Group>
                ) : undefined
              }
            >
              {scenario.name}
              {scenario.description ? ` — ${scenario.description}` : ''}
            </Badge>
          ))}
          {scenarios.length === 0 && (
            <Text size="sm" c="dimmed">No scenarios yet.</Text>
          )}
        </Group>
      </Stack>

      <Divider />

      {/* Services section */}
      <Group justify="space-between">
        <Title order={4}>Services</Title>
        <Button size="xs" onClick={() => setCreateServiceOpen(true)}>New Service</Button>
      </Group>

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
                  onClick={e => handleEditService(s, e)}
                >
                  Edit
                </Button>
                <Button
                  variant="light"
                  size="xs"
                  color="red"
                  onClick={e => handleDeleteService(s.name, e)}
                >
                  Delete
                </Button>
              </Group>
            </Card>
          ))}
        </SimpleGrid>
      )}

      {createServiceOpen && (
        <CreateServiceModal
          opened={createServiceOpen}
          onClose={() => setCreateServiceOpen(false)}
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
        opened={!!pendingDeleteService}
        entityName={pendingDeleteService ?? ''}
        onConfirm={() => deleteServiceMutation.mutate(pendingDeleteService!)}
        onClose={() => setPendingDeleteService(null)}
      />

      {scenarioModalOpen && (
        <CreateScenarioModal
          opened={scenarioModalOpen}
          onClose={handleCloseScenarioModal}
          workspace={activeWorkspace}
          projectName={projectName!}
          scenario={editScenario ?? undefined}
          projectKey={projectKey}
        />
      )}

      <ConfirmDeleteModal
        opened={!!pendingDeleteScenario}
        entityName={scenarios.find(s => s.id === pendingDeleteScenario)?.name ?? ''}
        onConfirm={() => deleteScenarioMutation.mutate(pendingDeleteScenario!)}
        onClose={() => setPendingDeleteScenario(null)}
      />
    </Stack>
  );
}
