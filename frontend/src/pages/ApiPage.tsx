import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import {
  Stack, Group, Title, Text, Button, Alert, Breadcrumbs, Anchor,
  TextInput, Textarea, NumberInput, Select, Divider, Paper, Loader,
} from '@mantine/core';
import {
  Api, HttpMethod, ResponseProviderConfig, Service,
  StaticResponseProviderConfig, ScriptResponseProviderConfig,
  TemplateResponseProviderConfig, ProxyResponseProviderConfig,
  ScenarioResponseProviderConfig, Scenario,
} from '@carbon/shared';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWorkspace } from '../context/WorkspaceContext';
import * as apiClient from '../api/client';

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

type ProviderType = ResponseProviderConfig['type'];
type ScenarioResponseType = 'static' | 'script' | 'template' | 'proxy';

interface ScenarioItemForm {
  scenarioTestFnCallbackStr: string;
  responseType: ScenarioResponseType;
  statusCode: number;
  headersRaw: string;
  body: string;
  script: string;
  template: string;
  environment: string;
}

interface FormValues {
  name: string;
  description: string;
  method: HttpMethod;
  urlPattern: string;
  statusCode: number;
  headers: { key: string; value: string }[];
  body: string;
  script: string;
  template: string;
  environment: string;
  scenarios: ScenarioItemForm[];
}

const DEFAULT_SCENARIO: ScenarioItemForm = {
  scenarioTestFnCallbackStr: '',
  responseType: 'static',
  statusCode: 200,
  headersRaw: '',
  body: '',
  script: '',
  template: '',
  environment: '',
};

const PROVIDER_LABELS: Record<ProviderType, string> = {
  static: 'Static',
  script: 'Script',
  template: 'Template',
  proxy: 'Proxy',
  scenario: 'Scenario',
};

function parseHeaders(raw: string): Record<string, string> {
  return Object.fromEntries(
    raw.split('\n')
      .map(line => {
        const idx = line.indexOf(':');
        return idx > 0 ? [line.slice(0, idx).trim(), line.slice(idx + 1).trim()] : null;
      })
      .filter((parts): parts is [string, string] => parts !== null && parts[0].length > 0)
  );
}

function headersToRaw(headers: Record<string, string>): string {
  return Object.entries(headers).map(([k, v]) => `${k}: ${v}`).join('\n');
}

function scenarioToForm(scenario: Scenario): ScenarioItemForm {
  const resp = scenario.response;
  return {
    scenarioTestFnCallbackStr: scenario.scenarioTestFnCallbackStr,
    responseType: resp.type as ScenarioResponseType,
    statusCode: resp.statusCode,
    headersRaw: headersToRaw(resp.headers),
    body: resp.type === 'static' ? (resp as StaticResponseProviderConfig).body : '',
    script: resp.type === 'script' ? (resp as ScriptResponseProviderConfig).script : '',
    template: resp.type === 'template' ? (resp as TemplateResponseProviderConfig).template : '',
    environment: resp.type === 'proxy' ? (resp as ProxyResponseProviderConfig).environment : '',
  };
}

function formToScenario(item: ScenarioItemForm): Scenario {
  const headers = parseHeaders(item.headersRaw);
  const base = { statusCode: Number(item.statusCode), headers };
  let response: Scenario['response'];
  switch (item.responseType) {
    case 'static': response = { type: 'static', ...base, body: item.body }; break;
    case 'script': response = { type: 'script', ...base, script: item.script }; break;
    case 'template': response = { type: 'template', ...base, template: item.template }; break;
    case 'proxy': response = { type: 'proxy', ...base, environment: item.environment }; break;
  }
  return { scenarioTestFnCallbackStr: item.scenarioTestFnCallbackStr, response };
}

function getDefaultValues(type: ProviderType, existingApi?: Api): FormValues {
  const staticResp = existingApi?.response.type === 'static' ? existingApi.response as StaticResponseProviderConfig : undefined;
  const scriptResp = existingApi?.response.type === 'script' ? existingApi.response as ScriptResponseProviderConfig : undefined;
  const templateResp = existingApi?.response.type === 'template' ? existingApi.response as TemplateResponseProviderConfig : undefined;
  const proxyResp = existingApi?.response.type === 'proxy' ? existingApi.response as ProxyResponseProviderConfig : undefined;
  const scenarioResp = existingApi?.response.type === 'scenario' ? existingApi.response as ScenarioResponseProviderConfig : undefined;
  const activeResp = staticResp ?? scriptResp ?? templateResp ?? proxyResp;
  return {
    name: existingApi?.name ?? '',
    description: existingApi?.description ?? '',
    method: existingApi?.method ?? 'GET',
    urlPattern: existingApi?.urlPattern ?? '',
    statusCode: activeResp?.statusCode ?? 200,
    headers: activeResp
      ? Object.entries(activeResp.headers).map(([key, value]) => ({ key, value }))
      : [],
    body: staticResp?.body ?? '',
    script: scriptResp?.script ?? '',
    template: templateResp?.template ?? '',
    environment: proxyResp?.environment ?? '',
    scenarios: scenarioResp ? scenarioResp.scenarios.map(scenarioToForm) : [{ ...DEFAULT_SCENARIO }],
  };
}

interface ApiFormProps {
  type: ProviderType;
  projectName: string;
  serviceName: string;
  servicePath: string;
  existingApi?: Api;
}

function ApiForm({ type, projectName, serviceName, servicePath, existingApi }: ApiFormProps) {
  const navigate = useNavigate();
  const { activeWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const isEdit = !!existingApi;

  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ['services', activeWorkspace, projectName],
    queryFn: () => apiClient.getServices(activeWorkspace, projectName),
    enabled: type === 'proxy',
  });

  const service = services.find(s => s.name === serviceName);
  const environmentOptions = (service?.environments ?? []).map(e => ({ value: e.name, label: e.name }));

  const { register, handleSubmit, control, watch, formState: { errors } } = useForm<FormValues>({
    defaultValues: getDefaultValues(type, existingApi),
  });

  const { fields: headerFields, append: appendHeader, remove: removeHeader } = useFieldArray({ control, name: 'headers' });
  const { fields: scenarioFields, append: appendScenario, remove: removeScenario } = useFieldArray({ control, name: 'scenarios' });

  const apisKey = ['apis', activeWorkspace, projectName, serviceName];

  const createMutation = useMutation<Api, Error, Api>({
    mutationFn: (data) => apiClient.createApi(activeWorkspace, projectName, serviceName, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: apisKey }); navigate(servicePath); },
  });

  const updateMutation = useMutation<Api, Error, Omit<Api, 'name'>>({
    mutationFn: (data) => apiClient.updateApi(activeWorkspace, projectName, serviceName, existingApi!.name, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: apisKey }); navigate(servicePath); },
  });

  const mutation = isEdit ? updateMutation : createMutation;

  const onSubmit = (values: FormValues) => {
    const { name, description, method, urlPattern, statusCode, headers, body, script, template, environment, scenarios } = values;
    const headersObj = Object.fromEntries(
      headers.filter(h => h.key.trim()).map(h => [h.key.trim(), h.value])
    );
    let response: ResponseProviderConfig;
    switch (type) {
      case 'static':
        response = { type: 'static', statusCode: Number(statusCode), headers: headersObj, body };
        break;
      case 'script':
        response = { type: 'script', statusCode: Number(statusCode), headers: headersObj, script };
        break;
      case 'template':
        response = { type: 'template', statusCode: Number(statusCode), headers: headersObj, template };
        break;
      case 'proxy':
        response = { type: 'proxy', statusCode: Number(statusCode), headers: headersObj, environment };
        break;
      case 'scenario':
        response = { type: 'scenario', scenarios: scenarios.map(formToScenario) };
        break;
    }
    const payload = { description, method, urlPattern, response };
    if (isEdit) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate({ name, ...payload });
    }
  };

  return (
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

        <Divider label={`${PROVIDER_LABELS[type]} Response`} labelPosition="left" />

        {type !== 'scenario' && (
          <>
            <Controller
              name="statusCode"
              control={control}
              render={({ field }) => (
                <NumberInput
                  label={type === 'proxy' ? 'Override Status Code' : 'Status Code'}
                  min={100}
                  max={599}
                  value={field.value}
                  onChange={v => field.onChange(Number(v))}
                  description={type === 'proxy' ? 'Status code to return if the proxy response should be overridden.' : undefined}
                />
              )}
            />

            <Stack gap="xs">
              <Group justify="space-between">
                <Text size="sm" fw={500}>{type === 'proxy' ? 'Override Response Headers' : 'Response Headers'}</Text>
                <Button size="xs" variant="light" onClick={() => appendHeader({ key: '', value: '' })}>+ Add Header</Button>
              </Group>
              {headerFields.map((field, i) => (
                <Group key={field.id} gap="xs">
                  <TextInput
                    {...register(`headers.${i}.key`)}
                    placeholder="Header name"
                    style={{ flex: 1 }}
                  />
                  <TextInput
                    {...register(`headers.${i}.value`)}
                    placeholder="Value"
                    style={{ flex: 2 }}
                  />
                  <Button size="xs" color="red" variant="subtle" px="xs" onClick={() => removeHeader(i)}>×</Button>
                </Group>
              ))}
            </Stack>
          </>
        )}

        {type === 'static' && (
          <Textarea
            label="Body"
            {...register('body')}
            rows={12}
            styles={{ input: { fontFamily: 'monospace' } }}
            placeholder='{"message": "ok"}'
          />
        )}

        {type === 'script' && (
          <Textarea
            label="Script"
            {...register('script', { required: 'Script is required' })}
            rows={12}
            styles={{ input: { fontFamily: 'monospace' } }}
            placeholder={"// Return a JSON-serialisable value\nreturn { message: 'ok', timestamp: Date.now() };"}
            description="JavaScript code executed to generate the response body."
            error={errors.script?.message}
          />
        )}

        {type === 'template' && (
          <Textarea
            label="Template"
            {...register('template', { required: 'Template is required' })}
            rows={12}
            styles={{ input: { fontFamily: 'monospace' } }}
            placeholder='{"id": "{{id}}", "name": "{{name}}"}'
            description="Mustache template rendered against the incoming request context."
            error={errors.template?.message}
          />
        )}

        {type === 'proxy' && (
          <Controller
            name="environment"
            control={control}
            rules={{ required: 'Environment is required' }}
            render={({ field }) => (
              environmentOptions.length > 0
                ? <Select
                    label="Environment"
                    data={environmentOptions}
                    allowDeselect={false}
                    value={field.value}
                    onChange={v => field.onChange(v ?? '')}
                    description="Target environment to proxy requests to."
                    error={errors.environment?.message}
                  />
                : <TextInput
                    label="Environment"
                    value={field.value}
                    onChange={e => field.onChange(e.target.value)}
                    placeholder="staging"
                    description="Must match a ServiceEnvironment name defined on this service."
                    error={errors.environment?.message}
                  />
            )}
          />
        )}

        {type === 'scenario' && (
          <>
            <Text size="sm" c="dimmed">
              Scenarios are evaluated in order. The first one whose test function returns true wins.
            </Text>

            {scenarioFields.map((field, index) => {
              const responseType = watch(`scenarios.${index}.responseType`);
              return (
                <Paper key={field.id} withBorder p="md" radius="sm">
                  <Stack gap="sm">
                    <Group justify="space-between">
                      <Text size="sm" fw={600}>Scenario {index + 1}</Text>
                      <Button
                        size="xs"
                        color="red"
                        variant="subtle"
                        onClick={() => removeScenario(index)}
                        disabled={scenarioFields.length === 1}
                      >
                        Remove
                      </Button>
                    </Group>

                    <Textarea
                      label="Test Function"
                      {...register(`scenarios.${index}.scenarioTestFnCallbackStr`, { required: 'Test function is required' })}
                      rows={3}
                      styles={{ input: { fontFamily: 'monospace' } }}
                      placeholder="(request) => request.query.env === 'staging'"
                      description="JavaScript callback that receives the request and returns true if this scenario applies."
                      error={errors.scenarios?.[index]?.scenarioTestFnCallbackStr?.message}
                    />

                    <Controller
                      name={`scenarios.${index}.responseType`}
                      control={control}
                      render={({ field: f }) => (
                        <Select
                          label="Response Type"
                          data={[
                            { value: 'static', label: 'Static' },
                            { value: 'script', label: 'Script' },
                            { value: 'template', label: 'Template' },
                            { value: 'proxy', label: 'Proxy' },
                          ]}
                          allowDeselect={false}
                          value={f.value}
                          onChange={v => f.onChange(v ?? 'static')}
                        />
                      )}
                    />

                    {responseType !== 'proxy' && (
                      <Controller
                        name={`scenarios.${index}.statusCode`}
                        control={control}
                        render={({ field: f }) => (
                          <NumberInput
                            label="Status Code"
                            min={100}
                            max={599}
                            value={f.value}
                            onChange={v => f.onChange(Number(v))}
                          />
                        )}
                      />
                    )}

                    <Textarea
                      label="Response Headers (Key: Value per line)"
                      {...register(`scenarios.${index}.headersRaw`)}
                      rows={2}
                      styles={{ input: { fontFamily: 'monospace' } }}
                      placeholder="Content-Type: application/json"
                    />

                    {responseType === 'static' && (
                      <Textarea
                        label="Body"
                        {...register(`scenarios.${index}.body`)}
                        rows={4}
                        styles={{ input: { fontFamily: 'monospace' } }}
                        placeholder='{"message": "ok"}'
                      />
                    )}

                    {responseType === 'script' && (
                      <Textarea
                        label="Script"
                        {...register(`scenarios.${index}.script`)}
                        rows={4}
                        styles={{ input: { fontFamily: 'monospace' } }}
                        placeholder="return { message: 'ok', timestamp: Date.now() };"
                        description="JavaScript code that returns a JSON-serialisable value."
                      />
                    )}

                    {responseType === 'template' && (
                      <Textarea
                        label="Template"
                        {...register(`scenarios.${index}.template`)}
                        rows={4}
                        styles={{ input: { fontFamily: 'monospace' } }}
                        placeholder='{"id": "{{id}}", "name": "{{name}}"}'
                        description="Mustache template rendered against the request context."
                      />
                    )}

                    {responseType === 'proxy' && (
                      <TextInput
                        label="Environment"
                        {...register(`scenarios.${index}.environment`, { required: 'Environment is required' })}
                        placeholder="staging"
                        description="Must match a ServiceEnvironment name defined on this service."
                        error={errors.scenarios?.[index]?.environment?.message}
                      />
                    )}
                  </Stack>
                </Paper>
              );
            })}

            <Button variant="outline" onClick={() => appendScenario({ ...DEFAULT_SCENARIO })}>
              + Add Scenario
            </Button>
          </>
        )}

        <Group justify="flex-end">
          <Button variant="default" onClick={() => navigate(servicePath)}>Cancel</Button>
          <Button type="submit" loading={mutation.isPending}>{isEdit ? 'Save' : 'Create'}</Button>
        </Group>
      </Stack>
    </form>
  );
}

export default function ApiPage() {
  const { projectName, serviceName, apiName } = useParams<{
    projectName: string;
    serviceName: string;
    apiName?: string;
  }>();
  const [searchParams] = useSearchParams();
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

  const type: ProviderType | undefined = isEdit
    ? existingApi?.response.type
    : (searchParams.get('type') as ProviderType | null) ?? undefined;

  const servicePath = `/projects/${encodeURIComponent(projectName!)}/services/${encodeURIComponent(serviceName!)}`;
  const projectPath = `/projects/${encodeURIComponent(projectName!)}`;

  const pageTitle = isEdit
    ? `Edit ${type ? PROVIDER_LABELS[type] : ''} API`
    : `New ${type ? PROVIDER_LABELS[type] : ''} API`;

  if (isEdit && isLoading) {
    return (
      <Stack align="center" mt="xl">
        <Loader />
        <Text c="dimmed">Loading API...</Text>
      </Stack>
    );
  }

  if (!type) {
    return (
      <Stack>
        <Alert color="red" title="Error">Invalid or missing API type.</Alert>
        <Button variant="default" onClick={() => navigate(servicePath)}>Back to Service</Button>
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
        type={type}
        projectName={projectName!}
        serviceName={serviceName!}
        servicePath={servicePath}
        existingApi={existingApi}
      />
    </Stack>
  );
}
