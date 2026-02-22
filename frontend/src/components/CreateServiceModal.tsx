import {
    Modal, Stack, TextInput,
    Button, Group, Alert, Divider,
    Checkbox,
} from '@mantine/core';
import { Service } from '@carbon/shared';
import { useWorkspace } from '../context/WorkspaceContext';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/client';

interface Props {
    opened: boolean;
    onClose: () => void;
    /** When provided the modal operates in edit mode and name is read-only. */
    service?: Service;
}


const DEFAULT_SERVICE: Service = {
    name: '',
    displayName: '',
    description: '',
    hostname: '',
    matchHostName: false,
    injectLatencyMs: 0,
    urlPrefix: '',
    enabled: true,
};

export default function CreateServiceModal({ opened, onClose, service }: Props) {
    const { activeWorkspace, currentProject } = useWorkspace();
    const queryClient = useQueryClient();
    const isEdit = !!service;

    const { register, handleSubmit, formState: { errors } } = useForm<Service>({
        defaultValues: service ?? DEFAULT_SERVICE,
    });

    const servicesKey = ['services', activeWorkspace, currentProject];

    const createMutation = useMutation<Service, Error, Service>({
        mutationFn: (data) => api.createService(activeWorkspace, currentProject!, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: servicesKey });
            onClose();
        },
    });

    const updateMutation = useMutation<Service, Error, Partial<Omit<Service, 'name'>>>({
        mutationFn: (data) => api.updateService(activeWorkspace, currentProject!, service!.name, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: servicesKey });
            onClose();
        },
    });

    const mutation = isEdit ? updateMutation : createMutation;

    const onSubmit = ({ name, ...rest }: Service) => {
        if (isEdit) {
            updateMutation.mutate(rest);
        } else {
            createMutation.mutate({ name, ...rest });
        }
    };

    return (
        <Modal opened={opened} onClose={onClose} title={isEdit ? 'Edit Service' : 'New Service'} size="lg">
            <form onSubmit={handleSubmit(onSubmit)}>
                <Stack>
                    {mutation.error && <Alert color="red" title="Error">{mutation.error.message}</Alert>}
                    <Group grow>
                        <TextInput
                            {...register("name", { required: "Name is required" })}
                            placeholder="Name of the service"
                            required
                            disabled={isEdit}
                        />
                        <TextInput
                            {...register("displayName", { required: "Display Name is required" })}
                            placeholder="Display Name of the service"
                            required
                        />
                    </Group>
                    <Group grow>
                        <TextInput
                            {...register("description", { required: "Description is required" })}
                            placeholder="Description of the service"
                            required
                        />
                    </Group>
                    <Group grow>
                        <TextInput
                            {...register("hostname", { required: "Host name is required" })}
                            placeholder="Host name of the service"
                            required
                        />
                        <Checkbox
                            {...register("matchHostName")}
                            label="Match Host Name"
                        />
                    </Group>
                    <Group grow>
                        <TextInput
                            {...register("urlPrefix")}
                            placeholder="URL prefix (e.g. /api/v1)"
                        />
                    </Group>
                    <Divider my="md" />
                    <Group justify="flex-end">
                        <Button variant="default" onClick={onClose}>Cancel</Button>
                        <Button onClick={handleSubmit(onSubmit)} loading={mutation.isPending}>
                            {isEdit ? 'Save' : 'Create'}
                        </Button>
                    </Group>
                </Stack>
            </form>
        </Modal>
    );
}
