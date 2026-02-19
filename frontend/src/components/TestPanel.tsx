import { useState } from 'react';

interface Props {
  basePath: string;
}

export default function TestPanel({ basePath }: Props) {
  const [method, setMethod] = useState('GET');
  const [path, setPath] = useState('/');
  const [body, setBody] = useState('');
  const [result, setResult] = useState<{ status: number; body: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const sendRequest = async () => {
    setLoading(true);
    setResult(null);
    try {
      const url = `http://localhost:3000${basePath}${path}`;
      const options: RequestInit = { method };
      if (body && method !== 'GET') {
        options.body = body;
        options.headers = { 'Content-Type': 'application/json' };
      }
      const res = await fetch(url, options);
      const text = await res.text();
      setResult({ status: res.status, body: text });
    } catch (err: any) {
      setResult({ status: 0, body: `Error: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="test-panel">
      <h3>Test Endpoint</h3>
      <div className="form-row">
        <select value={method} onChange={(e) => setMethod(e.target.value)}>
          {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <input
          type="text"
          value={path}
          onChange={(e) => setPath(e.target.value)}
          placeholder="/endpoint-path"
          style={{ flex: 1 }}
        />
        <button className="btn btn-primary" onClick={sendRequest} disabled={loading}>
          {loading ? 'Sending...' : 'Send'}
        </button>
      </div>
      {method !== 'GET' && (
        <div className="form-group">
          <label>Request Body</label>
          <textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder='{"key": "value"}' />
        </div>
      )}
      {result && (
        <div className="test-result">
          <div className={`status ${result.status >= 400 || result.status === 0 ? 'status-error' : 'status-ok'}`}>
            Status: {result.status}
          </div>
          <pre>{result.body}</pre>
        </div>
      )}
    </div>
  );
}
