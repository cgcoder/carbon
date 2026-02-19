export interface Workspace {
  /** Immutable identifier used as the directory name. Cannot be changed after creation. */
  name: string;
  /** Human-readable label shown in the UI. Can be updated freely. */
  displayName: string;
  description: string;
}
