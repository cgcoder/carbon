import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Stack, SimpleGrid, Card, Text, Title, Button, Group, ActionIcon, Alert,
} from '@mantine/core';
import { Project } from '@carbon/shared';
import { useWorkspace } from '../context/WorkspaceContext';
import CreateProjectModal from '../components/CreateProjectModal';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import * as api from '../api/client';

export default function WorkspacePage() {
  const { activeWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const projectsKey = ['projects', activeWorkspace];

  const { data: projects = [], error } = useQuery({
    queryKey: projectsKey,
    queryFn: () => api.getProjects(activeWorkspace),
    enabled: !!activeWorkspace,
  });

  const deleteMutation = useMutation({
    mutationFn: (name: string) => api.deleteProject(activeWorkspace, name),
    onSuccess: () => {
      setPendingDelete(null);
      queryClient.invalidateQueries({ queryKey: projectsKey });
    },
  });

  const handleEdit = (p: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditProject(p);
  };

  const handleDelete = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPendingDelete(name);
  };

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>{activeWorkspace}</Title>
        <Button onClick={() => setCreateOpen(true)}>New Project</Button>
      </Group>

      {(error || deleteMutation.error) && (
        <Alert color="red" title="Error" withCloseButton>
          {((error || deleteMutation.error) as Error).message}
        </Alert>
      )}

      {projects.length === 0 ? (
        <Text c="dimmed">No projects yet — create one to get started.</Text>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
          {projects.map(p => (
            <Card
              key={p.name}
              withBorder
              style={{ cursor: 'pointer' }}
              onClick={() => navigate(`/projects/${encodeURIComponent(p.name)}`)}
            >
              <Group justify="space-between" mb="xs" wrap="nowrap">
                <Text fw={600} truncate>{p.displayName || p.name}</Text>
                <Group gap={4} wrap="nowrap" onClick={e => e.stopPropagation()}>
                  <ActionIcon
                    variant="subtle"
                    size="sm"
                    onClick={e => handleEdit(p, e)}
                    title="Edit project"
                  >
                    ✎
                  </ActionIcon>
                  <ActionIcon
                    color="red"
                    variant="subtle"
                    size="sm"
                    onClick={e => handleDelete(p.name, e)}
                    title="Delete project"
                  >
                    ×
                  </ActionIcon>
                </Group>
              </Group>
              <Text c="dimmed" size="sm" lineClamp={2}>
                {p.description || 'No description'}
              </Text>
            </Card>
          ))}
        </SimpleGrid>
      )}

      <CreateProjectModal
        opened={createOpen}
        onClose={() => {
          setCreateOpen(false);
          queryClient.invalidateQueries({ queryKey: projectsKey });
        }}
      />

      {editProject && (
        <CreateProjectModal
          opened={!!editProject}
          project={editProject}
          onClose={() => {
            setEditProject(null);
            queryClient.invalidateQueries({ queryKey: projectsKey });
          }}
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
