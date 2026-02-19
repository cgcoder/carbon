import { MockResponse, StaticResponse, ProxyResponse, DynamicResponse } from '../types';

interface Props {
  response: MockResponse;
  onChange: (response: MockResponse) => void;
}

export default function ResponseEditor({ response, onChange }: Props) {
  const changeType = (type: MockResponse['type']) => {
    switch (type) {
      case 'static':
        onChange({ type: 'static', statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: '{}' });
        break;
      case 'proxy':
        onChange({ type: 'proxy', targetUrl: 'http://localhost:8080' });
        break;
      case 'dynamic':
        onChange({ type: 'dynamic', statusCode: 200, headers: { 'Content-Type': 'application/json' }, script: 'res.body = JSON.stringify({ message: "hello" });' });
        break;
    }
  };

  return (
    <div className="response-editor">
      <div className="form-group">
        <label>Response Type</label>
        <select value={response.type} onChange={(e) => changeType(e.target.value as MockResponse['type'])}>
          <option value="static">Static</option>
          <option value="proxy">Proxy</option>
          <option value="dynamic">Dynamic (Script)</option>
        </select>
      </div>

      {response.type === 'static' && <StaticEditor response={response} onChange={onChange} />}
      {response.type === 'proxy' && <ProxyEditor response={response} onChange={onChange} />}
      {response.type === 'dynamic' && <DynamicEditor response={response} onChange={onChange} />}
    </div>
  );
}

function StaticEditor({ response, onChange }: { response: StaticResponse; onChange: (r: MockResponse) => void }) {
  return (
    <>
      <div className="form-row">
        <div className="form-group">
          <label>Status Code</label>
          <input
            type="number"
            value={response.statusCode}
            onChange={(e) => onChange({ ...response, statusCode: parseInt(e.target.value) || 200 })}
          />
        </div>
        <div className="form-group">
          <label>Delay (ms)</label>
          <input
            type="number"
            value={response.delay || 0}
            onChange={(e) => onChange({ ...response, delay: parseInt(e.target.value) || undefined })}
          />
        </div>
      </div>
      <div className="form-group">
        <label>Headers (JSON)</label>
        <textarea
          rows={3}
          value={JSON.stringify(response.headers, null, 2)}
          onChange={(e) => {
            try { onChange({ ...response, headers: JSON.parse(e.target.value) }); } catch {}
          }}
        />
      </div>
      <div className="form-group">
        <label>Body</label>
        <textarea
          rows={8}
          value={response.body}
          onChange={(e) => onChange({ ...response, body: e.target.value })}
        />
      </div>
    </>
  );
}

function ProxyEditor({ response, onChange }: { response: ProxyResponse; onChange: (r: MockResponse) => void }) {
  return (
    <>
      <div className="form-group">
        <label>Target URL</label>
        <input
          type="text"
          value={response.targetUrl}
          onChange={(e) => onChange({ ...response, targetUrl: e.target.value })}
          placeholder="http://localhost:8080"
        />
      </div>
      <div className="form-group">
        <label>Timeout (ms)</label>
        <input
          type="number"
          value={response.timeout || 30000}
          onChange={(e) => onChange({ ...response, timeout: parseInt(e.target.value) || undefined })}
        />
      </div>
      <div className="form-group">
        <label>Modify Headers (JSON)</label>
        <textarea
          rows={3}
          value={JSON.stringify(response.modifyHeaders || {}, null, 2)}
          onChange={(e) => {
            try { onChange({ ...response, modifyHeaders: JSON.parse(e.target.value) }); } catch {}
          }}
        />
      </div>
    </>
  );
}

function DynamicEditor({ response, onChange }: { response: DynamicResponse; onChange: (r: MockResponse) => void }) {
  return (
    <>
      <div className="form-row">
        <div className="form-group">
          <label>Status Code</label>
          <input
            type="number"
            value={response.statusCode}
            onChange={(e) => onChange({ ...response, statusCode: parseInt(e.target.value) || 200 })}
          />
        </div>
        <div className="form-group">
          <label>Delay (ms)</label>
          <input
            type="number"
            value={response.delay || 0}
            onChange={(e) => onChange({ ...response, delay: parseInt(e.target.value) || undefined })}
          />
        </div>
      </div>
      <div className="form-group">
        <label>Headers (JSON)</label>
        <textarea
          rows={3}
          value={JSON.stringify(response.headers, null, 2)}
          onChange={(e) => {
            try { onChange({ ...response, headers: JSON.parse(e.target.value) }); } catch {}
          }}
        />
      </div>
      <div className="form-group">
        <label>Script</label>
        <p className="hint">
          Available: req (method, path, headers, query, body, params), res (statusCode, headers, body)
        </p>
        <textarea
          rows={10}
          className="code"
          value={response.script}
          onChange={(e) => onChange({ ...response, script: e.target.value })}
        />
      </div>
    </>
  );
}
