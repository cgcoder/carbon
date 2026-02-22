import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import {
  Stack, Group, Title, Text, Button, Alert, Breadcrumbs, Anchor,
  TextInput, Textarea, NumberInput, Loader, Badge, Switch,
} from '@mantine/core';
import { Api } from '@carbon/shared';
import { useWorkspace } from '../context/WorkspaceContext';
import * as apiClient from '../api/client';
import {
  ProviderFormItem, DEFAULT_PROVIDER, PROVIDER_TYPE_OPTIONS,
  mockProviderToForm, formToMockProviderConfig,
} from '../utils/providerForm';

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

  const { data: apis, isLoading } = useQuery({
    queryKey: apisKey,
    queryFn: () => apiClient.getApis(activeWorkspace, projectName!, serviceName!),
    enabled: !apiFromState,
  });

  const existingApi = apiFromState ?? apis?.find(a => a.name === apiName);
  const existingProvider = isNew ? null : existingApi?.providers.find(p => p.name === providerName);

  const defaultValues: ProviderFormItem = existingProvider
    ? mockProviderToForm(existingProvider)
    : { ...DEFAULT_PROVIDER, providerType: initialType as ProviderFormItem['providerType'] };

  const { register, handleSubmit, control, watch, formState: { errors } } = useForm<ProviderFormItem>({
    defaultValues,
  });

  const providerType = watch('providerType');

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
        <Stack>
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

          <Textarea
            label="Matcher (optional)"
            {...register('matcher')}
            rows={3}
            styles={{ input: { fontFamily: 'monospace' } }}
            placeholder={"// Leave empty for catch-all\nreturn request.headers['x-env'] === 'staging';"}
            description="JavaScript function body receiving (request: MockRequest). Return true to use this provider. Empty = always matches."
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

          <Textarea
            label="Response Headers (Key: Value per line)"
            {...register('headersRaw')}
            rows={2}
            styles={{ input: { fontFamily: 'monospace' } }}
            placeholder="Content-Type: application/json"
          />

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
            <Textarea
              label="Body"
              {...register('body')}
              rows={8}
              styles={{ input: { fontFamily: 'monospace' } }}
              placeholder='{"message": "ok"}'
            />
          )}

          {providerType === 'script' && (
            <Textarea
              label="Script"
              {...register('script', { required: 'Script is required' })}
              rows={8}
              styles={{ input: { fontFamily: 'monospace' } }}
              placeholder={"// Return a JSON-serialisable value\nreturn { message: 'ok', timestamp: Date.now() };"}
              description="JavaScript function body executed to generate the response body. Receives (request: MockRequest)."
              error={errors.script?.message}
            />
          )}

          {providerType === 'template' && (
            <Textarea
              label="Template"
              {...register('template', { required: 'Template is required' })}
              rows={8}
              styles={{ input: { fontFamily: 'monospace' } }}
              placeholder='{"id": "{{request.path}}", "name": "{{name}}"}'
              description="Mustache template rendered against the incoming request context."
              error={errors.template?.message}
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

              <Textarea
                label="Outgoing Request Builder (optional)"
                {...register('outgoingRequestBuilderScript')}
                rows={5}
                styles={{ input: { fontFamily: 'monospace' } }}
                placeholder={"// outgoing.url, outgoing.query, outgoing.body, outgoing.headers\noutgoing.headers['X-Forwarded-By'] = 'carbon';"}
                description="JavaScript snippet that receives (request: MockRequest, proxyRequest: ProxyRequest). Mutate outgoing to customise the forwarded call."
              />

              <Textarea
                label="Response Builder (optional)"
                {...register('responseBuilderScript')}
                rows={5}
                styles={{ input: { fontFamily: 'monospace' } }}
                placeholder={"// response.status, response.headers, response.body\nresponse.headers['X-Proxied-By'] = 'carbon';"}
                description="JavaScript snippet that receives (request: MockRequest, response). Mutate response to transform the reply."
              />
            </>
          )}

          <Group justify="flex-end">
            <Button variant="default" onClick={() => navigate(apiEditPath)}>Cancel</Button>
            <Button type="submit" loading={updateMutation.isPending}>Save</Button>
          </Group>
        </Stack>
      </form>
    </Stack>
  );
}
