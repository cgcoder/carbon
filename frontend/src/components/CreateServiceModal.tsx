import { useState, useEffect } from 'react';
import {
    Modal, Stack, TextInput, Textarea, NumberInput, Select, Autocomplete,
    Button, Group, Alert, Text, Title, Divider,
    Checkbox,
} from '@mantine/core';
import { HttpMethod, Service } from '@carbon/shared';
import { useWorkspace } from '../context/WorkspaceContext';
import * as api from '../api/client';
import { useFieldArray, useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';

interface Props {
    opened: boolean;
    onClose: () => void;
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
};

export default function CreateServiceModal({ opened, onClose }: Props) {
    const { activeWorkspace, currentProject } = useWorkspace();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const { register, handleSubmit, formState: { errors }, control } = useForm<Service>({ defaultValues: DEFAULT_SERVICE });
    const { fields, append, remove } = useFieldArray({ control, name: 'environments' });

    const mutation = useMutation<Service>({
        mutationFn: (service) => {
            return axios.post(`/api/workspaces/${activeWorkspace}/projects/${currentProject}/services`, service)
        },
    })

    const onSubmit = (data: Service) => {
        setLoading(true);
        setError('');
        try {
            mutation.mutate(data, {
                onSuccess: () => {
                    onClose();
                }
            });

        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };


    return (
        <Modal opened={opened} onClose={onClose} title="New Service" size="lg">
            <form onSubmit={handleSubmit(onSubmit)}>
                <Stack>
                    {error && <Alert color="red" title="Error">{error}</Alert>}
                    <Group grow>
                        <TextInput
                            {...register("name", { required: "Name is required" })}
                            placeholder="Name of the service"
                            required
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
                    <Divider my="md" />
                    {
                        fields.map((field, index) => (
                            <Group key={field.id} grow>
                                <TextInput
                                    {...register(`environments.${index}.environment` as const, { required: "Environment name is required" })}
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
                        ))
                    }
                    <Group grow>
                        <Button fullWidth={false} variant="outline" onClick={() => append({ environment: '', host: '', useProxyAuth: false })}>Add Environment</Button>
                    </Group>
                    <Divider my="md" />
                    <Group justify="flex-end">
                        <Button variant="default" onClick={onClose}>Cancel</Button>
                        <Button onClick={handleSubmit(onSubmit)} loading={loading}>Create</Button>
                    </Group>
                </Stack>
            </form>
        </Modal>
    );
}
