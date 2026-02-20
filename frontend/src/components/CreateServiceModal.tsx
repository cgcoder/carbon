import {
    Modal, Stack, TextInput,
    Button, Group, Alert, Divider,
    Checkbox,
} from '@mantine/core';
import { HttpMethod, Service } from '@carbon/shared';
import { useWorkspace } from '../context/WorkspaceContext';
import { useFieldArray, useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/client';

interface Props {
    opened: boolean;
    onClose: () => void;
    /** When provided the modal operates in edit mode and name is read-only. */
    service?: Service;
}

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

const METHOD_COLORS: Record<string, string> = {
    GET: 'green', POST: 'blue', PUT: 'orange', PATCH: 'yellow',
    DELETE: 'red', HEAD: 'gray', OPTIONS: 'violet',
};

const DEFAULT_SERVICE: Service = {
    name: '',
    displayName: '',
    description: '',
    hostname: '',
    matchHostName: false,
    environments: [],
    injectLatencyMs: 0,
    urlPrefix: '',
};

export default function CreateServiceModal({ opened, onClose, service }: Props) {
    const { activeWorkspace, currentProject } = useWorkspace();
    const queryClient = useQueryClient();
    const isEdit = !!service;

    const { register, handleSubmit, formState: { errors }, control } = useForm<Service>({
        defaultValues: service ?? DEFAULT_SERVICE,
    });
    const { fields, append, remove } = useFieldArray({ control, name: 'environments' });

    const servicesKey = ['services', activeWorkspace, currentProject];

    const createMutation = useMutation<Service, Error, Service>({
        mutationFn: (data) => api.createService(activeWorkspace, currentProject!, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: servicesKey });
            onClose();
        },
    });

    const updateMutation = useMutation<Service, Error, Omit<Service, 'name'>>({
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
                    {fields.map((field, index) => (
                        <Group key={field.id} grow>
                            <TextInput
                                {...register(`environments.${index}.name` as const, { required: "Environment name is required" })}
                                placeholder="Environment (e.g. staging, production)"
                                required
                            />
                            <TextInput
                                {...register(`environments.${index}.host` as const, { required: "Host is required" })}
                                placeholder="Host URL for this environment"
                                required
                            />
                            <Checkbox
                                {...register(`environments.${index}.useProxyAuth` as const)}
                                label="Use Proxy Auth"
                            />
                            <Button variant="outline" color="red" onClick={() => remove(index)}>Remove</Button>
                        </Group>
                    ))}
                    <Group grow>
                        <Button fullWidth={false} variant="outline" onClick={() => append({ name: '', host: '', useProxyAuth: false })}>Add Environment</Button>
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
