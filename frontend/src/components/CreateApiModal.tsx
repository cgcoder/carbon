import { useState, useEffect } from 'react';
import {
  Modal, Stack, TextInput, Textarea, NumberInput, Select, Autocomplete,
  Button, Group, Alert, Text, Title, Divider,
} from '@mantine/core';
import { HttpMethod } from '@carbon/shared';
import { useWorkspace } from '../context/WorkspaceContext';
import * as api from '../api/client';

interface Props {
  opened: boolean;
  onClose: () => void;
  projectName: string;
  existingServices: string[];
}

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

const METHOD_COLORS: Record<string, string> = {
  GET: 'green', POST: 'blue', PUT: 'orange', PATCH: 'yellow',
  DELETE: 'red', HEAD: 'gray', OPTIONS: 'violet',
};

export default function CreateApiModal({ opened, onClose, projectName, existingServices }: Props) {
  const { activeWorkspace } = useWorkspace();
  const [serviceName, setServiceName] = useState('');
  const [name, setName] = useState('');
  const [method, setMethod] = useState<string>('GET');
  const [urlPattern, setUrlPattern] = useState('');
  const [statusCode, setStatusCode] = useState<number | string>(200);
  const [headers, setHeaders] = useState<{ key: string; value: string }[]>([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (opened) {
      setServiceName(existingServices[0] ?? '');
      setName('');
      setMethod('GET');
      setUrlPattern('');
      setStatusCode(200);
      setHeaders([]);
      setBody('');
      setError('');
    }
  }, [opened, existingServices]);

  const addHeader = () => setHeaders(h => [...h, { key: '', value: '' }]);
  const removeHeader = (i: number) => setHeaders(h => h.filter((_, j) => j !== i));
  const updateHeader = (i: number, field: 'key' | 'value', val: string) =>
    setHeaders(h => h.map((x, j) => j === i ? { ...x, [field]: val } : x));

  const handleSubmit = async () => {
    if (!serviceName || !name || !urlPattern) {
      setError('Service, API name and URL pattern are required.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // Create the service if it does not already exist
      if (!existingServices.includes(serviceName)) {
        await api.createService(activeWorkspace, projectName, { name: serviceName, displayName: serviceName });
      }

      const headersObj = Object.fromEntries(
        headers.filter(h => h.key.trim()).map(h => [h.key.trim(), h.value])
      );

      await api.createApi(activeWorkspace, projectName, serviceName, {
        name,
        description: '',
        method: method as HttpMethod,
        urlPattern,
        response: {
          type: 'static',
          statusCode: Number(statusCode),
          headers: headersObj,
          body,
        },
      });
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="New API" size="lg">
      <Stack>
        {error && <Alert color="red" title="Error">{error}</Alert>}

        <Autocomplete
          label="Service"
          data={existingServices}
          value={serviceName}
          onChange={setServiceName}
          placeholder="Select existing or type a new service name"
          description="A new service will be created automatically if the name doesn't exist yet."
          required
        />

        <Group grow>
          <TextInput
            label="API Name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="get-user"
            required
          />
          <Select
            label="Method"
            value={method}
            onChange={v => setMethod(v ?? 'GET')}
            data={METHODS.map(m => ({ value: m, label: m }))}
            styles={{ option: { color: METHOD_COLORS[method] } }}
            allowDeselect={false}
          />
        </Group>

        <TextInput
          label="URL Pattern (regex)"
          value={urlPattern}
          onChange={e => setUrlPattern(e.target.value)}
          placeholder="^/users/\d+$"
          description="Matched as a regular expression against the request path."
          required
        />

        <Divider label="Static Response" labelPosition="left" />

        <NumberInput
          label="Status Code"
          value={statusCode}
          onChange={setStatusCode}
          min={100}
          max={599}
        />

        <Stack gap="xs">
          <Group justify="space-between">
            <Text size="sm" fw={500}>Response Headers</Text>
            <Button size="xs" variant="light" onClick={addHeader}>+ Add Header</Button>
          </Group>
          {headers.map((h, i) => (
            <Group key={i} gap="xs">
              <TextInput
                placeholder="Header name"
                value={h.key}
                onChange={e => updateHeader(i, 'key', e.target.value)}
                style={{ flex: 1 }}
              />
              <TextInput
                placeholder="Value"
                value={h.value}
                onChange={e => updateHeader(i, 'value', e.target.value)}
                style={{ flex: 2 }}
              />
              <Button size="xs" color="red" variant="subtle" px="xs" onClick={() => removeHeader(i)}>
                ×
              </Button>
            </Group>
          ))}
        </Stack>

        <Textarea
          label="Body"
          value={body}
          onChange={e => setBody(e.target.value)}
          rows={5}
          styles={{ input: { fontFamily: 'monospace' } }}
          placeholder='{"message": "ok"}'
        />

        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} loading={loading}>Create</Button>
        </Group>
      </Stack>
    </Modal>
  );
}
