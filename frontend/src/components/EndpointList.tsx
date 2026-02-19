import { Link } from 'react-router-dom';
import { MockEndpoint } from '../types';

interface Props {
  projectId: string;
  endpoints: MockEndpoint[];
  onDelete: (id: string) => void;
  onToggle: (endpoint: MockEndpoint) => void;
}

const METHOD_COLORS: Record<string, string> = {
  GET: '#61affe',
  POST: '#49cc90',
  PUT: '#fca130',
  DELETE: '#f93e3e',
  PATCH: '#50e3c2',
};

export default function EndpointList({ projectId, endpoints, onDelete, onToggle }: Props) {
  if (endpoints.length === 0) {
    return <p className="empty">No endpoints yet. Create one to get started.</p>;
  }

  return (
    <div className="endpoint-list">
      {endpoints.map((ep) => (
        <div key={ep.id} className={`endpoint-item ${ep.enabled ? '' : 'disabled'}`}>
          <div className="endpoint-info">
            <span
              className="method-badge"
              style={{ backgroundColor: METHOD_COLORS[ep.method] || '#999' }}
            >
              {ep.method}
            </span>
            <Link to={`/projects/${projectId}/endpoints/${ep.id}`} className="endpoint-path">
              {ep.path}
            </Link>
            <span className="response-type">{ep.response.type}</span>
          </div>
          <div className="endpoint-actions">
            <label className="toggle">
              <input
                type="checkbox"
                checked={ep.enabled}
                onChange={() => onToggle(ep)}
              />
              <span className="toggle-label">{ep.enabled ? 'On' : 'Off'}</span>
            </label>
            <button className="btn btn-danger btn-sm" onClick={() => onDelete(ep.id)}>
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
