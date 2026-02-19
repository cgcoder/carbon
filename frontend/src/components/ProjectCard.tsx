import { Link } from 'react-router-dom';
import { Project } from '../types';

interface Props {
  project: Project;
  onDelete: (id: string) => void;
}

export default function ProjectCard({ project, onDelete }: Props) {
  return (
    <div className="card">
      <div className="card-header">
        <Link to={`/projects/${project.id}`} className="card-title">
          {project.name}
        </Link>
        <button className="btn btn-danger btn-sm" onClick={() => onDelete(project.id)}>
          Delete
        </button>
      </div>
      <p className="card-desc">{project.description || 'No description'}</p>
      <code className="base-path">{project.basePath}</code>
    </div>
  );
}
