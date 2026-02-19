import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Stack, SimpleGrid, Card, Text, Title, Button, Group, ActionIcon, Alert,
} from '@mantine/core';
import { Project } from '@carbon/shared';
import { useWorkspace } from '../context/WorkspaceContext';
import CreateProjectModal from '../components/CreateProjectModal';
import * as api from '../api/client';

export default function WorkspacePage() {
  const { activeWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      setProjects(await api.getProjects(activeWorkspace));
    } catch (e: any) {
      setError(e.message);
    }
  }, [activeWorkspace]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.deleteProject(activeWorkspace, name);
      setProjects(ps => ps.filter(p => p.name !== name));
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>{activeWorkspace}</Title>
        <Button onClick={() => setCreateOpen(true)}>New Project</Button>
      </Group>

      {error && <Alert color="red" title="Error" onClose={() => setError('')} withCloseButton>{error}</Alert>}

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
              <Text c="dimmed" size="sm" lineClamp={2}>
                {p.description || 'No description'}
              </Text>
            </Card>
          ))}
        </SimpleGrid>
      )}

      <CreateProjectModal
        opened={createOpen}
        onClose={() => { setCreateOpen(false); load(); }}
      />
    </Stack>
  );
}
