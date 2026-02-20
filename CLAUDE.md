# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Carbon is a mock API server for testing purposes. It lets you configure mock APIs that return dummy responses or proxy to real backends. The project has a management UI and a separate mock server.

## Commands

All commands run from the repo root unless noted.

```bash
# Development (builds shared lib, then starts backend with hot-reload)
npm run dev

# Build everything (shared → backend → frontend)
npm run build

# Run individual workspaces
npm run dev -w backend     # tsx watch mode
npm run dev -w frontend    # Vite dev server (port 5173)
npm run build -w shared    # Compile shared types

# Start built backend
cd backend && node dist/index.js
```

No test or lint scripts are configured yet.

## Architecture

### Monorepo Structure

npm workspaces: `shared/`, `backend/`, `frontend/`

- **`shared/`** — TypeScript interfaces only. Consumed by both backend and frontend.
- **`backend/`** — Express server. Entry point: `src/index.ts`.
- **`frontend/`** — React + Vite app. Entry point: `src/main.tsx`. Dev proxy: `/api` → `http://localhost:3001`.

### Dual-Server Backend

The backend starts two Express servers from one process:

| Server | Port | Purpose |
|--------|------|---------|
| Mock Server | 3000 | Handles incoming mock API requests from clients under test |
| Management API | 3001 | CRUD for configuration; consumed by the React frontend |

Config overrides: `MOCK_PORT`, `MGMT_PORT`, `DATA_DIR` env vars (`backend/src/config.ts`).

### Data Hierarchy

```
Workspace → Project → Service → Api[]
```

- **Workspace**: top-level grouping
- **Project**: groups services belonging to an app/team
- **Service**: represents one backend service; has hostname matching and per-environment proxy URLs; optional latency injection
- **Api**: one endpoint — method + URL pattern + `ResponseProviderConfig`

The `name` field is immutable (used as the directory key). `displayName` is the editable label.

### File-Based Storage

Data lives in `backend/data/` as nested JSON files:

```
data/<workspace>/workspace.json
data/<workspace>/<project>/project.json
data/<workspace>/<project>/<service>/service.json
data/<workspace>/<project>/<service>/apis.json
```

`FileStore` (`backend/src/storage/`) maintains an in-memory cache over these files. The Mock Server reads from `MockConfigCache` which is populated from `FileStore`.

### Mock Request Routing

The mock server (`backend/src/mock/`) matches incoming requests by:
1. Optional hostname → narrows to a Service
2. URL pattern (via `path-to-regexp`) + HTTP method → selects an Api
3. Dispatches to a response provider based on `ResponseProviderConfig.type`

**Response provider types** (defined in shared models):
- `static` — implemented: returns hard-coded body/status/headers
- `script` — not implemented (501): execute JS to generate response
- `template` — not implemented (501): Mustache template rendering
- `proxy` — not implemented (501): forward to environment URL
- `scenario` — not implemented (501): conditional routing

### Frontend Stack

React 18 · React Router v6 · Mantine UI v7 · TanStack React Query v5 · React Hook Form v7 · Axios

Pages: `/` (workspace/project list) and `/projects/:projectName` (project detail with services and APIs).

API calls go through `frontend/src/api/client.ts` typed wrappers. Active workspace state lives in `WorkspaceContext`.

### Management API Routes

All prefixed with `/api`:

- `/workspaces` — workspace CRUD
- `/workspaces/:ws/projects` — project CRUD
- `/workspaces/:ws/projects/:proj/services` — service CRUD
- `/workspaces/:ws/projects/:proj/services/:svc/apis` — API CRUD
- `/active-workspace` — get/set the currently active workspace
- `/config` — server config (ports, data dir)

### Data Loading Pattern
When loading data, use react-query hooks to load the data instead of using useEffect or useCallback methods.

### Data Mutation (Submit) Pattern
When submitting or mutating data, use react-query hook to mutate the data.

### Forms
Use react-hook-form to manage the state of the form.