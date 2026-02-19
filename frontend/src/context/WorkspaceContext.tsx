import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Workspace } from '@carbon/shared';
import * as api from '../api/client';
import { useLocation } from 'react-router-dom';

interface WorkspaceContextType {
  workspaces: Workspace[];
  activeWorkspace: string;
  currentProject?: string;
  switchWorkspace: (name: string) => Promise<void>;
  refreshWorkspaces: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType>({
  workspaces: [],
  activeWorkspace: 'Default',
  switchWorkspace: async () => { },
  refreshWorkspaces: async () => { },
});

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState('Default');
  const location = useLocation();
  const pathSegments = location.pathname.split("/");
  const currentProject = pathSegments.length >= 3 && pathSegments[1] === 'projects' ? pathSegments[2] : undefined;

  const refresh = useCallback(async () => {
    const [wsList, { workspace }] = await Promise.all([
      api.getWorkspaces(),
      api.getActiveWorkspace(),
    ]);
    setWorkspaces(wsList);
    setActiveWorkspace(workspace);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const switchWorkspace = async (name: string) => {
    await api.setActiveWorkspace(name);
    setActiveWorkspace(name);
  };

  return (
    <WorkspaceContext.Provider value={{ workspaces, activeWorkspace, switchWorkspace, refreshWorkspaces: refresh, currentProject }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export const useWorkspace = () => useContext(WorkspaceContext);
