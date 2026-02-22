import { Modal, Stack, TextInput, Textarea, Button, Group, Alert } from '@mantine/core';
import { useWorkspace } from '../context/WorkspaceContext';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import * as api from '../api/client';
import { Project } from '@carbon/shared';

interface Props {
  opened: boolean;
  onClose: () => void;
  project?: Project;
}

interface FormValues {
  name: string;
  displayName: string;
  description: string;
}

const NAME_PATTERN = /^[\w. ]+$/;

export default function CreateProjectModal({ opened, onClose, project }: Props) {
  const { activeWorkspace } = useWorkspace();
  const isEdit = !!project;

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormValues>({
    defaultValues: {
      name: project?.name ?? '',
      displayName: project?.displayName ?? '',
      description: project?.description ?? '',
    },
  });

  const mutation = useMutation<Project, Error, FormValues>({
    mutationFn: ({ name, displayName, description }) =>
      isEdit
        ? api.updateProject(activeWorkspace, project!.name, { displayName, description })
        : api.createProject(activeWorkspace, { name, displayName: displayName || name, description }),
    onSuccess: () => {
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
    <Modal opened={opened} onClose={handleClose} title={isEdit ? 'Edit Project' : 'New Project'}>
      <form onSubmit={handleSubmit((data) => mutation.mutate(data))}>
        <Stack>
          {mutation.error && <Alert color="red" title="Error">{mutation.error.message}</Alert>}
          {!isEdit && (
            <TextInput
              label="Name"
              {...register('name', {
                required: 'Name is required',
                pattern: {
                  value: NAME_PATTERN,
                  message: 'Letters, digits, dots and spaces only',
                },
              })}
              placeholder="my-project"
              description="Letters, digits, dots and spaces only."
              error={errors.name?.message}
              required
            />
          )}
          <TextInput
            label="Display Name"
            {...register('displayName')}
            placeholder="My Project"
          />
          <Textarea
            label="Description"
            {...register('description')}
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
