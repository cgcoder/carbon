import { Modal, Stack, TextInput, Textarea, Button, Group, Alert } from '@mantine/core';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/client';
import { ProjectScenario } from '@carbon/shared';

interface Props {
  opened: boolean;
  onClose: () => void;
  workspace: string;
  projectName: string;
  scenario?: ProjectScenario;
  projectKey: unknown[];
}

interface FormValues {
  name: string;
  description: string;
}

export default function CreateScenarioModal({ opened, onClose, workspace, projectName, scenario, projectKey }: Props) {
  const queryClient = useQueryClient();
  const isEdit = !!scenario;

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormValues>({
    defaultValues: {
      name: scenario?.name ?? '',
      description: scenario?.description ?? '',
    },
  });

  const mutation = useMutation<ProjectScenario, Error, FormValues>({
    mutationFn: ({ name, description }) =>
      isEdit
        ? api.updateScenario(workspace, projectName, scenario!.id, { name, description })
        : api.createScenario(workspace, projectName, { name, description }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKey });
      reset();
      onClose();
    },
  });

  const handleClose = () => {
    reset();
    mutation.reset();
    onClose();
  };

  return (
    <Modal opened={opened} onClose={handleClose} title={isEdit ? 'Edit Scenario' : 'New Scenario'}>
      <form onSubmit={handleSubmit((data) => mutation.mutate(data))}>
        <Stack>
          {mutation.error && <Alert color="red" title="Error">{mutation.error.message}</Alert>}
          <TextInput
            label="Name"
            {...register('name', { required: 'Name is required' })}
            placeholder="e.g. Error State"
            error={errors.name?.message}
            required
          />
          <Textarea
            label="Description"
            {...register('description')}
            placeholder="Describe when this scenario applies"
            rows={2}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={handleClose}>Cancel</Button>
            <Button type="submit" loading={mutation.isPending}>{isEdit ? 'Save' : 'Create'}</Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
