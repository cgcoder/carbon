import { useState } from 'react';
import { Group, Text, Button, Select } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../context/WorkspaceContext';
import CreateWorkspaceModal from './CreateWorkspaceModal';

export default function AppNav() {
  const { workspaces, activeWorkspace, switchWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);

  const handleWorkspaceChange = async (name: string | null) => {
    if (!name || name === activeWorkspace) return;
    await switchWorkspace(name);
    navigate('/');
  };

  return (
    <>
      <Group h="100%" px="md" justify="space-between">
        <Text fw={700} size="xl" c="blue" style={{ letterSpacing: '-0.5px' }}>
          Carbon
        </Text>
        <Group gap="sm">
          <Button variant="light" size="sm" onClick={() => setCreateOpen(true)}>
            New Workspace
          </Button>
          <Select
            value={activeWorkspace}
            onChange={handleWorkspaceChange}
            data={workspaces.map(w => ({ value: w.name, label: w.displayName || w.name }))}
            w={180}
            allowDeselect={false}
          />
        </Group>
      </Group>
      <CreateWorkspaceModal opened={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  );
}
