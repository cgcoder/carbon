import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import {
  Stack, Group, Title, Text, Button, Alert, Breadcrumbs, Anchor,
  TextInput, Select, Divider, Paper, Loader,
  Modal, SimpleGrid, Card, Accordion, Badge, ActionIcon, Switch,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Api, HttpMethod, MockProviderConfig } from '@carbon/shared';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWorkspace } from '../context/WorkspaceContext';
import * as apiClient from '../api/client';
import {
  ProviderType, PROVIDER_TYPE_OPTIONS,
} from '../utils/providerForm';

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

interface FormValues {
  name: string;
  description: string;
  method: HttpMethod;
  urlPattern: string;
}

function getDefaultValues(existingApi?: Api): FormValues {
  if (existingApi) {
    return {
      name: existingApi.name,
      description: existingApi.description,
      method: existingApi.method,
      urlPattern: existingApi.urlPattern,
    };
  }
  return {
    name: '',
    description: '',
    method: 'GET',
    urlPattern: '',
  };
}

// ── Read-only accordion shown in edit mode ────────────────────────────────────

const PROVIDER_TYPE_COLORS: Record<string, string> = {
  static: 'blue',
  script: 'violet',
  template: 'teal',
  proxy: 'orange',
};

function ProviderReadOnlyAccordion({
  providers,
  onEdit,
  onDelete,
  onAdd,
  onToggle,
}: {
  providers: MockProviderConfig[];
  onEdit: (name: string) => void;
  onDelete: (name: string) => void;
  onAdd: () => void;
  onToggle: (name: string, enabled: boolean) => void;
}) {
  return (
    <Stack gap="xs">
      <Accordion variant="separated" radius="sm">
        {providers.map((p) => {
          const type = p.provider.type === 'scenario' ? 'static' : p.provider.type;
          const typeLabel = PROVIDER_TYPE_OPTIONS.find(o => o.type === type)?.label ?? type;
          const prov = p.provider as any;
          const isEnabled = p.enabled !== false;

          return (
            <Accordion.Item key={p.name} value={p.name} style={!isEnabled ? { opacity: 0.5 } : undefined}>
              <Accordion.Control>
                <Group gap="sm">
                  <Badge color={PROVIDER_TYPE_COLORS[type] ?? 'gray'} variant="light" size="sm">
                    {typeLabel}
                  </Badge>
                  {!isEnabled && (
                    <Badge color="gray" variant="outline" size="sm">disabled</Badge>
                  )}
                  <Text fw={500} size="sm">{p.name}</Text>
                  {p.matcher.body && (
                    <Text size="xs" c="dimmed" ff="monospace" style={{ flex: 1 }} lineClamp={1}>
                      {p.matcher.body}
                    </Text>
                  )}
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap="xs">
                  <Group justify="space-between" gap="xs">
                    <Switch
                      label="Enabled"
                      size="sm"
                      checked={isEnabled}
                      onChange={(e) => onToggle(p.name, e.currentTarget.checked)}
                    />
                    <Group gap="xs">
                      <Button size="xs" variant="light" onClick={() => onEdit(p.name)}>
                        Edit
                      </Button>
                      <ActionIcon
                        size="sm"
                        color="red"
                        variant="subtle"
                        onClick={() => onDelete(p.name)}
                        title="Remove provider"
                      >
                        ×
                      </ActionIcon>
                    </Group>
                  </Group>

                  {p.matcher.body && (
                    <Stack gap={2}>
                      <Text size="xs" fw={600} c="dimmed">Matcher</Text>
                      <Paper withBorder p="xs" radius="sm" bg="gray.0">
                        <Text size="xs" ff="monospace" style={{ whiteSpace: 'pre-wrap' }}>
                          {p.matcher.body}
                        </Text>
                      </Paper>
                    </Stack>
                  )}

                  <Group gap="xl">
                    {prov.statusCode != null && (
                      <Stack gap={2}>
                        <Text size="xs" fw={600} c="dimmed">Status</Text>
                        <Text size="sm">{prov.statusCode}</Text>
                      </Stack>
                    )}
                    {prov.injectLatencyMs != null && prov.injectLatencyMs > 0 && (
                      <Stack gap={2}>
                        <Text size="xs" fw={600} c="dimmed">Latency</Text>
                        <Text size="sm">{prov.injectLatencyMs} ms</Text>
                      </Stack>
                    )}
                  </Group>

                  {prov.headers && Object.keys(prov.headers).length > 0 && (
                    <Stack gap={2}>
                      <Text size="xs" fw={600} c="dimmed">Headers</Text>
                      <Paper withBorder p="xs" radius="sm" bg="gray.0">
                        {Object.entries(prov.headers as Record<string, string>).map(([k, v]) => (
                          <Text key={k} size="xs" ff="monospace">{k}: {v}</Text>
                        ))}
                      </Paper>
                    </Stack>
                  )}

                  {type === 'static' && prov.body && (
                    <Stack gap={2}>
                      <Text size="xs" fw={600} c="dimmed">Body</Text>
                      <Paper withBorder p="xs" radius="sm" bg="gray.0">
                        <Text size="xs" ff="monospace" style={{ whiteSpace: 'pre-wrap' }} lineClamp={6}>
                          {prov.body}
                        </Text>
                      </Paper>
                    </Stack>
                  )}

                  {type === 'script' && prov.script && (
                    <Stack gap={2}>
                      <Text size="xs" fw={600} c="dimmed">Script</Text>
                      <Paper withBorder p="xs" radius="sm" bg="gray.0">
                        <Text size="xs" ff="monospace" style={{ whiteSpace: 'pre-wrap' }} lineClamp={6}>
                          {prov.script}
                        </Text>
                      </Paper>
                    </Stack>
                  )}

                  {type === 'template' && prov.template && (
                    <Stack gap={2}>
                      <Text size="xs" fw={600} c="dimmed">Template</Text>
                      <Paper withBorder p="xs" radius="sm" bg="gray.0">
                        <Text size="xs" ff="monospace" style={{ whiteSpace: 'pre-wrap' }} lineClamp={6}>
                          {prov.template}
                        </Text>
                      </Paper>
                    </Stack>
                  )}

                  {type === 'proxy' && prov.targetUrl && (
                    <Stack gap={2}>
                      <Text size="xs" fw={600} c="dimmed">Target URL</Text>
                      <Text size="sm" ff="monospace">{prov.targetUrl}</Text>
                    </Stack>
                  )}
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          );
        })}
      </Accordion>

      <Button size="xs" variant="subtle" onClick={onAdd} style={{ alignSelf: 'flex-start' }}>
        + Add Provider
      </Button>
    </Stack>
  );
}

// ── Main form ────────────────────────────────────────────────────────────────

interface ApiFormProps {
  projectName: string;
  serviceName: string;
  servicePath: string;
  existingApi?: Api;
}

function ApiForm({ projectName, serviceName, servicePath, existingApi }: ApiFormProps) {
  const navigate = useNavigate();
  const { activeWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const isEdit = !!existingApi;

  const [typeModalOpened, { open: openTypeModal, close: closeTypeModal }] = useDisclosure(false);

  const { register, handleSubmit, control, formState: { errors } } = useForm<FormValues>({
    defaultValues: getDefaultValues(existingApi),
  });

  const apisKey = ['apis', activeWorkspace, projectName, serviceName];

  const createMutation = useMutation<Api, Error, Api>({
    mutationFn: (data) => apiClient.createApi(activeWorkspace, projectName, serviceName, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: apisKey }); navigate(servicePath); },
  });

  const updateMutation = useMutation<Api, Error, Omit<Api, 'name'>>({
    mutationFn: (data) => apiClient.updateApi(activeWorkspace, projectName, serviceName, existingApi!.name, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: apisKey }); navigate(servicePath); },
  });

  const patchProviderMutation = useMutation<Api, Error, Omit<Api, 'name'>>({
    mutationFn: (data) => apiClient.updateApi(activeWorkspace, projectName, serviceName, existingApi!.name, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: apisKey }); },
  });

  const mutation = isEdit ? updateMutation : createMutation;

  const onSubmit = (values: FormValues) => {
    const { name, description, method, urlPattern } = values;
    if (isEdit) {
      // In edit mode, providers are managed per-provider via ProviderEditPage.
      // We send the providers from the original existingApi unchanged.
      updateMutation.mutate({
        description,
        method,
        urlPattern,
        providers: existingApi!.providers,
      });
    } else {
      createMutation.mutate({ name, description, method, urlPattern, providers: [] });
    }
  };

  // Edit mode: navigate to ProviderEditPage
  const providerEditPath = (name: string) =>
    `/projects/${encodeURIComponent(projectName)}/services/${encodeURIComponent(serviceName)}/apis/${encodeURIComponent(existingApi!.name)}/providers/${encodeURIComponent(name)}/edit`;

  const handleEditProvider = (name: string) => {
    navigate(providerEditPath(name), { state: { api: existingApi } });
  };

  const handleDeleteProvider = (name: string) => {
    const updatedProviders = existingApi!.providers.filter(p => p.name !== name);
    updateMutation.mutate({
      description: existingApi!.description,
      method: existingApi!.method,
      urlPattern: existingApi!.urlPattern,
      providers: updatedProviders,
    });
  };

  const handleToggleProvider = (name: string, enabled: boolean) => {
    const updatedProviders = existingApi!.providers.map(p =>
      p.name === name ? { ...p, enabled } : p
    );
    patchProviderMutation.mutate({
      description: existingApi!.description,
      method: existingApi!.method,
      urlPattern: existingApi!.urlPattern,
      providers: updatedProviders,
    });
  };

  const handleAddProviderEdit = (type: ProviderType) => {
    const newPath = `/projects/${encodeURIComponent(projectName)}/services/${encodeURIComponent(serviceName)}/apis/${encodeURIComponent(existingApi!.name)}/providers/new/edit`;
    navigate(newPath, { state: { api: existingApi, providerType: type } });
    closeTypeModal();
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Stack>
          {mutation.error && <Alert color="red" title="Error">{mutation.error.message}</Alert>}

          <Group grow>
            <TextInput
              label="API Name"
              {...register('name', { required: 'Name is required' })}
              placeholder="get-user"
              required
              disabled={isEdit}
              error={errors.name?.message}
            />
            <Controller
              name="method"
              control={control}
              render={({ field }) => (
                <Select
                  label="Method"
                  data={METHODS.map(m => ({ value: m, label: m }))}
                  allowDeselect={false}
                  value={field.value}
                  onChange={v => field.onChange(v ?? 'GET')}
                />
              )}
            />
          </Group>

          <TextInput
            label="URL Pattern"
            {...register('urlPattern', { required: 'URL Pattern is required' })}
            placeholder="^/users/\d+$"
            description="Matched as a regular expression against the request path."
            required
            error={errors.urlPattern?.message}
          />

          <TextInput
            label="Description"
            {...register('description')}
            placeholder="Optional description"
          />

          <Group justify="flex-end">
            <Button variant="default" onClick={() => navigate(servicePath)}>Cancel</Button>
            <Button type="submit" loading={mutation.isPending}>{isEdit ? 'Save' : 'Create'}</Button>
          </Group>

          {isEdit && (
            <>
              <Divider label="Response Providers" labelPosition="left" />

              <Text size="sm" c="dimmed">
                Providers are evaluated in order. The first one whose matcher returns true is used.
                Leave the matcher empty to create a catch-all provider.
              </Text>

              <ProviderReadOnlyAccordion
                providers={existingApi!.providers}
                onEdit={handleEditProvider}
                onDelete={handleDeleteProvider}
                onAdd={openTypeModal}
                onToggle={handleToggleProvider}
              />
            </>
          )}
        </Stack>
      </form>

      <Modal
        opened={typeModalOpened}
        onClose={closeTypeModal}
        title="Choose Provider Type"
        centered
        size="md"
      >
        <Stack gap="xs">
          <Text size="sm" c="dimmed">
            Select the type of response provider to add.
          </Text>
          <SimpleGrid cols={2} spacing="sm">
            {PROVIDER_TYPE_OPTIONS.map(({ type, label, description }) => (
              <Card
                key={type}
                withBorder
                p="md"
                style={{ cursor: 'pointer' }}
                onClick={() => handleAddProviderEdit(type)}
              >
                <Stack gap={4}>
                  <Text fw={600} size="sm">{label}</Text>
                  <Text size="xs" c="dimmed">{description}</Text>
                </Stack>
              </Card>
            ))}
          </SimpleGrid>
        </Stack>
      </Modal>
    </>
  );
}

export default function ApiPage() {
  const { projectName, serviceName, apiName } = useParams<{
    projectName: string;
    serviceName: string;
    apiName?: string;
  }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { activeWorkspace } = useWorkspace();

  const isEdit = !!apiName;
  const apiFromState = (location.state as { api?: Api } | null)?.api;

  const { data: apis, isLoading } = useQuery({
    queryKey: ['apis', activeWorkspace, projectName, serviceName],
    queryFn: () => apiClient.getApis(activeWorkspace, projectName!, serviceName!),
    enabled: isEdit && !apiFromState,
  });

  const existingApi: Api | undefined = isEdit
    ? (apiFromState ?? apis?.find(a => a.name === apiName))
    : undefined;

  const servicePath = `/projects/${encodeURIComponent(projectName!)}/services/${encodeURIComponent(serviceName!)}`;
  const projectPath = `/projects/${encodeURIComponent(projectName!)}`;

  const pageTitle = isEdit ? 'Edit API' : 'New API';

  if (isEdit && isLoading) {
    return (
      <Stack align="center" mt="xl">
        <Loader />
        <Text c="dimmed">Loading API...</Text>
      </Stack>
    );
  }

  return (
    <Stack>
      <Breadcrumbs>
        <Anchor onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>Workspaces</Anchor>
        <Anchor onClick={() => navigate(projectPath)} style={{ cursor: 'pointer' }}>{projectName}</Anchor>
        <Anchor onClick={() => navigate(servicePath)} style={{ cursor: 'pointer' }}>{serviceName}</Anchor>
        <Text>{pageTitle}</Text>
      </Breadcrumbs>

      <Title order={2}>{pageTitle}</Title>

      <ApiForm
        projectName={projectName!}
        serviceName={serviceName!}
        servicePath={servicePath}
        existingApi={existingApi}
      />
    </Stack>
  );
}
