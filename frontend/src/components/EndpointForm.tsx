import { useState } from 'react';
import { MockEndpoint, MockResponse } from '../types';
import ResponseEditor from './ResponseEditor';

interface Props {
  initial?: MockEndpoint;
  onSave: (data: { path: string; method: string; response: MockResponse; enabled: boolean }) => void;
  onCancel: () => void;
}

const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'ALL'];

export default function EndpointForm({ initial, onSave, onCancel }: Props) {
  const [path, setPath] = useState(initial?.path || '/');
  const [method, setMethod] = useState(initial?.method || 'GET');
  const [enabled, setEnabled] = useState(initial?.enabled !== false);
  const [response, setResponse] = useState<MockResponse>(
    initial?.response || { type: 'static', statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: '{}' }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ path, method, response, enabled });
  };

  return (
    <form onSubmit={handleSubmit} className="endpoint-form">
      <div className="form-row">
        <div className="form-group">
          <label>Method</label>
          <select value={method} onChange={(e) => setMethod(e.target.value)}>
            {METHODS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <div className="form-group" style={{ flex: 1 }}>
          <label>Path</label>
          <input type="text" value={path} onChange={(e) => setPath(e.target.value)} placeholder="/users/:id" />
        </div>
      </div>

      <div className="form-group">
        <label className="toggle">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          <span className="toggle-label">Enabled</span>
        </label>
      </div>

      <ResponseEditor response={response} onChange={setResponse} />

      <div className="form-actions">
        <button type="submit" className="btn btn-primary">Save</button>
        <button type="button" className="btn" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
