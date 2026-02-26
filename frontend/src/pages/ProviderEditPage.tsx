import { useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm, useFieldArray } from 'react-hook-form';
import {
  Stack, Group, Title, Text, Button, Alert, Breadcrumbs, Anchor,
  TextInput, Textarea, NumberInput, Loader, Badge, Switch, Menu, Paper, ActionIcon, MultiSelect,
} from '@mantine/core';
import { Api } from '@carbon/shared';
import { useWorkspace } from '../context/WorkspaceContext';
import * as apiClient from '../api/client';
import {
  ProviderFormItem, DEFAULT_PROVIDER, PROVIDER_TYPE_OPTIONS,
  mockProviderToForm, formToMockProviderConfig,
} from '../utils/providerForm';
import { CodeEditor } from '../components/CodeEditor';

export default function ProviderEditPage() {
  const { projectName, serviceName, apiName, providerName } = useParams<{
    projectName: string;
    serviceName: string;
    apiName: string;
    providerName: string;
  }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { activeWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  const isNew = providerName === 'new';
  const initialType = (location.state as { providerType?: string } | null)?.providerType ?? 'static';
  const apiFromState = (location.state as { api?: Api } | null)?.api;

  const apisKey = ['apis', activeWorkspace, projectName, serviceName];
  const projectKey = ['project', activeWorkspace, projectName];

  const { data: apis, isLoading } = useQuery({
    queryKey: apisKey,
    queryFn: () => apiClient.getApis(activeWorkspace, projectName!, serviceName!),
    enabled: !apiFromState,
  });

  const { data: project } = useQuery({
    queryKey: projectKey,
    queryFn: () => apiClient.getProject(activeWorkspace, projectName!),
    enabled: !!projectName,
  });

  const scenarioOptions = (project?.scenarios ?? []).map(s => ({ value: s.id, label: s.name }));

  const existingApi = apiFromState ?? apis?.find(a => a.name === apiName);
  const existingProvider = isNew ? null : existingApi?.providers.find(p => p.name === providerName);

  const defaultValues: ProviderFormItem = existingProvider
    ? mockProviderToForm(existingProvider)
    : { ...DEFAULT_PROVIDER, providerType: initialType as ProviderFormItem['providerType'] };

  const { register, handleSubmit, control, watch, setValue, getValues, formState: { errors } } = useForm<ProviderFormItem>({
    defaultValues,
  });

  const providerType = watch('providerType');
  const isMultipart = watch('isMultipart');

  const { fields: partFields, append: appendPart, remove: removePart } = useFieldArray({
    control,
    name: 'multipartParts',
  });

  const COMMON_HEADERS = [
    'Content-Type: application/json',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Type: text/html; charset=utf-8',
    'Content-Type: application/xml',
    'Cache-Control: no-cache',
    'Cache-Control: max-age=3600',
    'Access-Control-Allow-Origin: *',
    'X-Content-Type-Options: nosniff',
  ];

  const appendHeader = (header: string) => {
    const current = getValues('headersRaw').trim();
    setValue('headersRaw', current ? `${current}\n${header}` : header, { shouldDirty: true });
  };

  const apiEditPath = `/projects/${encodeURIComponent(projectName!)}/services/${encodeURIComponent(serviceName!)}/apis/${encodeURIComponent(apiName!)}/edit`;
  const servicePath = `/projects/${encodeURIComponent(projectName!)}/services/${encodeURIComponent(serviceName!)}`;
  const projectPath = `/projects/${encodeURIComponent(projectName!)}`;

  const updateMutation = useMutation<Api, Error, ProviderFormItem>({
    mutationFn: (data) => {
      const newProvider = formToMockProviderConfig(data);
      const currentProviders = existingApi!.providers;
      const updatedProviders = isNew
        ? [...currentProviders, newProvider]
        : currentProviders.map(p => p.name === providerName ? newProvider : p);
      const { name, ...rest } = existingApi!;
      return apiClient.updateApi(activeWorkspace, projectName!, serviceName!, name, {
        ...rest,
        providers: updatedProviders,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apisKey });
      navigate(apiEditPath, { state: { api: undefined } });
    },
  });

  const onSubmit = (values: ProviderFormItem) => {
    updateMutation.mutate(values);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSubmit(onSubmit)();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSubmit]);

  if (isLoading) {
    return (
      <Stack align="center" mt="xl">
        <Loader />
        <Text c="dimmed">Loading...</Text>
      </Stack>
    );
  }

  if (!existingApi) {
    return <Alert color="red" title="Error">API not found.</Alert>;
  }

  const typeLabel = PROVIDER_TYPE_OPTIONS.find(o => o.type === providerType)?.label ?? providerType;
  const pageTitle = isNew ? `New ${typeLabel} Provider` : `Edit Provider`;

  const handleFormatJson = (fieldName: 'body') => {
    const raw = getValues(fieldName);
    try {
      const formatted = JSON.stringify(JSON.parse(raw), null, 2);
      setValue(fieldName, formatted, { shouldDirty: true });
    } catch {
      // leave as-is; invalid JSON — user will see syntax error in editor
    }
  };

  return (
    <Stack>
      <Breadcrumbs>
        <Anchor onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>Workspaces</Anchor>
        <Anchor onClick={() => navigate(projectPath)} style={{ cursor: 'pointer' }}>{projectName}</Anchor>
        <Anchor onClick={() => navigate(servicePath)} style={{ cursor: 'pointer' }}>{serviceName}</Anchor>
        <Anchor onClick={() => navigate(apiEditPath)} style={{ cursor: 'pointer' }}>{apiName}</Anchor>
        <Text>{pageTitle}</Text>
      </Breadcrumbs>

      <Group align="center" gap="sm">
        <Title order={2}>{pageTitle}</Title>
        <Badge variant="light" size="lg">{typeLabel}</Badge>
      </Group>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Stack pb={80}>
          {updateMutation.error && (
            <Alert color="red" title="Error">{updateMutation.error.message}</Alert>
          )}

          <Controller
            name="enabled"
            control={control}
            render={({ field: f }) => (
              <Switch
                label="Enabled"
                description="When disabled, this provider is skipped during request matching."
                checked={f.value}
                onChange={e => f.onChange(e.currentTarget.checked)}
              />
            )}
          />

          <Controller
            name="scenarioIds"
            control={control}
            render={({ field: f }) => (
              <MultiSelect
                label="Attach to Scenarios"
                description="This provider applies only when one of these scenarios is active. Leave empty to apply to all scenarios."
                data={scenarioOptions}
                value={f.value}
                onChange={f.onChange}
                placeholder="All scenarios"
                clearable
              />
            )}
          />

          <TextInput
            label="Name"
            {...register('name', {
              required: 'Name is required',
              validate: (value) => {
                const otherProviders = existingApi.providers.filter(p => p.name !== (isNew ? undefined : providerName));
                const isDuplicate = otherProviders.some(p => p.name.trim() === value.trim());
                return !isDuplicate || 'A provider with this name already exists in this API';
              },
            })}
            placeholder="e.g. success-response"
            description="Unique label for this provider within the API."
            error={errors.name?.message}
            required
          />

          <Controller
            name="matcher"
            control={control}
            render={({ field: f }) => (
              <CodeEditor
                label="Matcher (optional)"
                language="javascript"
                value={f.value}
                onChange={f.onChange}
                placeholder={"// Leave empty for catch-all\nreturn request.headers['x-env'] === 'staging';"}
                description="JavaScript function body receiving (request: MockRequest). Return true to use this provider. Empty = always matches."
                minHeight="80px"
              />
            )}
          />

          <Controller
            name="statusCode"
            control={control}
            render={({ field: f }) => (
              <NumberInput
                label={providerType === 'proxy' ? 'Override Status Code' : 'Status Code'}
                min={100}
                max={599}
                value={f.value}
                onChange={v => f.onChange(Number(v))}
              />
            )}
          />

          <Stack gap={4}>
            <Group justify="space-between" align="center">
              <Text size="sm" fw={500}>Response Headers (Key: Value per line)</Text>
              <Menu shadow="md" width={280} position="bottom-end">
                <Menu.Target>
                  <Button variant="light" size="compact-xs">+ Add common header</Button>
                </Menu.Target>
                <Menu.Dropdown>
                  {COMMON_HEADERS.map(h => (
                    <Menu.Item
                      key={h}
                      onClick={() => appendHeader(h)}
                      fz="xs"
                      ff="monospace"
                    >
                      {h}
                    </Menu.Item>
                  ))}
                </Menu.Dropdown>
              </Menu>
            </Group>
            <Textarea
              {...register('headersRaw')}
              rows={3}
              styles={{ input: { fontFamily: 'monospace' } }}
              placeholder="Content-Type: application/json"
            />
          </Stack>

          <Controller
            name="injectLatencyMs"
            control={control}
            render={({ field: f }) => (
              <NumberInput
                label="Inject Latency (ms)"
                min={0}
                value={f.value}
                onChange={v => f.onChange(Number(v))}
                description="Additional delay before sending this response (stacks with service-level latency)."
              />
            )}
          />

          {providerType === 'static' && (
            <Stack gap="sm">
              <Controller
                name="isMultipart"
                control={control}
                render={({ field: f }) => (
                  <Switch
                    label="Multipart response"
                    description="When enabled, the response is sent as multipart/mixed with the parts below instead of a single body."
                    checked={f.value}
                    onChange={e => f.onChange(e.currentTarget.checked)}
                  />
                )}
              />

              {!isMultipart && (
                <Controller
                  name="body"
                  control={control}
                  render={({ field: f }) => (
                    <CodeEditor
                      label="Body"
                      language="json"
                      value={f.value}
                      onChange={f.onChange}
                      placeholder={'{"message": "ok"}'}
                      description='Response body. Use Ctrl+F / Ctrl+H to search and replace.'
                      actions={
                        <Button
                          variant="light"
                          size="compact-xs"
                          onClick={() => handleFormatJson('body')}
                        >
                          Format JSON
                        </Button>
                      }
                    />
                  )}
                />
              )}

              {isMultipart && (
                <Stack gap="xs">
                  <Group justify="space-between" align="center">
                    <Text size="sm" fw={500}>Multipart Parts</Text>
                    <Button
                      variant="light"
                      size="compact-xs"
                      onClick={() => appendPart({ contentType: '', body: '' })}
                    >
                      + Add Part
                    </Button>
                  </Group>
                  {partFields.length === 0 && (
                    <Text size="sm" c="dimmed">No parts yet. Click "+ Add Part" to add one.</Text>
                  )}
                  {partFields.map((part, index) => (
                    <Paper key={part.id} withBorder p="sm" radius="sm">
                      <Stack gap="xs">
                        <Group justify="space-between" align="center">
                          <Text size="xs" fw={600} c="dimmed">Part {index + 1}</Text>
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            size="sm"
                            onClick={() => removePart(index)}
                            aria-label="Remove part"
                          >
                            ✕
                          </ActionIcon>
                        </Group>
                        <TextInput
                          label="Content-Type"
                          placeholder="application/json"
                          {...register(`multipartParts.${index}.contentType`)}
                        />
                        <Textarea
                          label="Body"
                          placeholder="Part content"
                          rows={3}
                          styles={{ input: { fontFamily: 'monospace' } }}
                          {...register(`multipartParts.${index}.body`)}
                        />
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Stack>
          )}

          {providerType === 'script' && (
            <Controller
              name="script"
              rules={{ required: 'Script is required' }}
              control={control}
              render={({ field: f }) => (
                <CodeEditor
                  label="Script"
                  language="javascript"
                  value={f.value}
                  onChange={f.onChange}
                  placeholder={"// Return a JSON-serialisable value\nreturn { message: 'ok', timestamp: Date.now() };"}
                  description="JavaScript function body executed to generate the response body. Receives (request: MockRequest). Use Ctrl+F / Ctrl+H to search and replace."
                  error={errors.script?.message}
                  required
                />
              )}
            />
          )}

          {providerType === 'template' && (
            <Controller
              name="template"
              rules={{ required: 'Template is required' }}
              control={control}
              render={({ field: f }) => (
                <CodeEditor
                  label="Template"
                  language="html"
                  value={f.value}
                  onChange={f.onChange}
                  placeholder={'{"id": "{{request.path}}", "name": "{{name}}"}'}
                  description="Mustache template rendered against the incoming request context. Use Ctrl+F / Ctrl+H to search and replace."
                  error={errors.template?.message}
                  required
                />
              )}
            />
          )}

          {providerType === 'proxy' && (
            <>
              <TextInput
                label="Target URL"
                {...register('targetUrl', { required: 'Target URL is required' })}
                placeholder="https://api.example.com"
                description="Base URL of the downstream service. The incoming request path and query string are appended when forwarding."
                error={errors.targetUrl?.message}
              />

              <Controller
                name="outgoingRequestBuilderScript"
                control={control}
                render={({ field: f }) => (
                  <CodeEditor
                    label="Outgoing Request Builder (optional)"
                    language="javascript"
                    value={f.value}
                    onChange={f.onChange}
                    placeholder={"// outgoing.url, outgoing.query, outgoing.body, outgoing.headers\noutgoing.headers['X-Forwarded-By'] = 'carbon';"}
                    description="JavaScript snippet that receives (request: MockRequest, proxyRequest: ProxyRequest). Mutate outgoing to customise the forwarded call."
                    minHeight="120px"
                  />
                )}
              />

              <Controller
                name="responseBuilderScript"
                control={control}
                render={({ field: f }) => (
                  <CodeEditor
                    label="Response Builder (optional)"
                    language="javascript"
                    value={f.value}
                    onChange={f.onChange}
                    placeholder={"// response.status, response.headers, response.body\nresponse.headers['X-Proxied-By'] = 'carbon';"}
                    description="JavaScript snippet that receives (request: MockRequest, response). Mutate response to transform the reply."
                    minHeight="120px"
                  />
                )}
              />
            </>
          )}

          <div style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 200,
            display: 'flex',
            gap: 8,
            background: 'var(--mantine-color-body)',
            borderRadius: 'var(--mantine-radius-md)',
            boxShadow: 'var(--mantine-shadow-md)',
            padding: '8px 12px',
            border: '1px solid var(--mantine-color-default-border)',
          }}>
            <Button variant="default" onClick={() => navigate(apiEditPath)}>Cancel</Button>
            <Button type="submit" loading={updateMutation.isPending}>Save</Button>
          </div>
        </Stack>
      </form>
    </Stack>
  );
}
