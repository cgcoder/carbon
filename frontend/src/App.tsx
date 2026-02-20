import { Routes, Route } from 'react-router-dom';
import { AppShell } from '@mantine/core';
import { WorkspaceProvider } from './context/WorkspaceContext';
import AppNav from './components/AppNav';
import WorkspacePage from './pages/WorkspacePage';
import ProjectPage from './pages/ProjectPage';
import ServicePage from './pages/ServicePage';
import ApiPage from './pages/ApiPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WorkspaceProvider>
        <AppShell header={{ height: 60 }} padding="md">
          <AppShell.Header>
            <AppNav />
          </AppShell.Header>
          <AppShell.Main>
            <Routes>
              <Route path="/" element={<WorkspacePage />} />
              <Route path="/projects/:projectName" element={<ProjectPage />} />
              <Route path="/projects/:projectName/services/:serviceName" element={<ServicePage />} />
              <Route path="/projects/:projectName/services/:serviceName/apis/new" element={<ApiPage />} />
              <Route path="/projects/:projectName/services/:serviceName/apis/:apiName/edit" element={<ApiPage />} />
            </Routes>
          </AppShell.Main>
        </AppShell>
      </WorkspaceProvider>
    </QueryClientProvider>
  );
}
