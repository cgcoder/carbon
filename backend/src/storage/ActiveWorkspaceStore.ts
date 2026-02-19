export class ActiveWorkspaceStore {
  private activeWorkspace = 'Default';

  get(): string {
    return this.activeWorkspace;
  }

  set(name: string): void {
    this.activeWorkspace = name;
  }
}

export const activeWorkspaceStore = new ActiveWorkspaceStore();
