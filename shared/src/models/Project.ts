export interface Project {
  /** Immutable identifier used as the directory name. Cannot be changed after creation. */
  name: string;
  /** Human-readable label shown in the UI. Can be updated freely. */
  displayName: string;
  description: string;
  /** Workspace this project belongs to. Defaults to "Default". */
  workspace: string;
}
