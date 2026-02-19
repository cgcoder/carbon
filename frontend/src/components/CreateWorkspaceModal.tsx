import { useState, useEffect } from 'react';
import { Modal, Stack, TextInput, Textarea, Button, Group, Alert } from '@mantine/core';
import { useWorkspace } from '../context/WorkspaceContext';
import * as api from '../api/client';

interface Props {
  opened: boolean;
  onClose: () => void;
}

export default function CreateWorkspaceModal({ opened, onClose }: Props) {
  const { refreshWorkspaces } = useWorkspace();
  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (opened) { setName(''); setDisplayName(''); setDescription(''); setError(''); }
  }, [opened]);

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      await api.createWorkspace({ name, displayName: displayName || name, description });
      await refreshWorkspaces();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="New Workspace">
      <Stack>
        {error && <Alert color="red" title="Error">{error}</Alert>}
        <TextInput
          label="Name"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="my-workspace"
          description="Used as the directory name — cannot be changed later."
          required
        />
        <TextInput
          label="Display Name"
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          placeholder={name || 'My Workspace'}
        />
        <Textarea
          label="Description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={2}
        />
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} loading={loading} disabled={!name}>Create</Button>
        </Group>
      </Stack>
    </Modal>
  );
}
