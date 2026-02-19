# Carbon Data Model Specification

> Source of truth: `shared/src/models/`
> All types are exported from the `@carbon/shared` package.

---

## Overview

The data model is organised around a four-level hierarchy:

```
Workspace
  └── Project
        └── Service
              └── Api
```

Each level is persisted to disk as a JSON file inside a dedicated directory. Names at each level are **immutable** identifiers (used as directory/file names); human-readable labels are stored separately in `displayName`.

---

## Entities

### Workspace

**File:** `workspace.json`

A workspace groups related projects and maps to a top-level directory on disk. A `Default` workspace is always present.

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | `string` | yes | Immutable. Used as the directory name. |
| `displayName` | `string` | yes | Mutable label shown in the UI. |
| `description` | `string` | yes | |

---

### Project

**File:** `<project-name>/project.json`

A project is the top-level organisational unit for service mocks. Its directory name must match `name` exactly.

**Name constraints:** spaces, numbers, underscores (`_`) and dots (`.`) only.

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | `string` | yes | Immutable. Used as the directory name. |
| `displayName` | `string` | yes | Mutable label shown in the UI. |
| `description` | `string` | yes | |
| `workspace` | `string` | yes | Name of the parent `Workspace`. Defaults to `"Default"`. |

---

### Service

**File:** `<project-name>/<service-name>/service.json`

A service belongs to a project and represents a single upstream service being mocked. It may declare one or more named environment targets that APIs can proxy to.

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | `string` | yes | Immutable. Used as the directory name. |
| `displayName` | `string` | yes | Mutable label shown in the UI. |
| `description` | `string` | no | |
| `environments` | `ServiceEnvironment[]` | no | Named proxy targets for this service. |

#### ServiceEnvironment

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | `string` | yes | Identifier referenced by `ProxyResponseProviderConfig.environment`. |
| `host` | `string` | yes | Base URL of the upstream host (e.g. `https://api.staging.example.com`). |
| `useProxyAuth` | `boolean` | no | Whether to forward proxy authentication credentials. |

---

### Api

**File:** `<project-name>/<service-name>/apis.json` (array of `Api`)

An API definition belongs to a service. Its `name` must be unique within the parent service. Incoming requests are matched by `method` and `urlPattern`; the `response` field determines how the mock responds.

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | `string` | yes | Unique within the parent service. |
| `description` | `string` | yes | |
| `method` | `HttpMethod` | yes | HTTP verb to match. |
| `urlPattern` | `string` | yes | Regex matched against the incoming request path. |
| `response` | `ResponseProviderConfig` | yes | How the mock generates its response. |

#### HttpMethod

```
'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS'
```

---

## Response Provider Configs

`ResponseProviderConfig` is a discriminated union on the `type` field. It controls how the mock generates its HTTP response.

### StaticResponseProviderConfig

Returns a hard-coded response as-is.

| Field | Type | Notes |
|---|---|---|
| `type` | `'static'` | |
| `statusCode` | `number` | |
| `headers` | `Record<string, string>` | |
| `body` | `string` | |

---

### ScriptResponseProviderConfig

Executes a JavaScript snippet to produce the response body.

| Field | Type | Notes |
|---|---|---|
| `type` | `'script'` | |
| `statusCode` | `number` | |
| `headers` | `Record<string, string>` | |
| `script` | `string` | JavaScript code that returns a JSON-serialisable value. |

---

### TemplateResponseProviderConfig

Renders the response body from a [Mustache](https://mustache.github.io/) template.

| Field | Type | Notes |
|---|---|---|
| `type` | `'template'` | |
| `statusCode` | `number` | |
| `headers` | `Record<string, string>` | |
| `template` | `string` | Mustache template string. |

---

### ProxyResponseProviderConfig

Forwards the request to a named environment defined on the parent service.

| Field | Type | Notes |
|---|---|---|
| `type` | `'proxy'` | |
| `environment` | `string` | Must match a `ServiceEnvironment.name` on the parent `Service`. |

---

### ScenarioResponseProviderConfig

Evaluates a list of `Scenario` entries in order and returns the response from the **first match**.

| Field | Type | Notes |
|---|---|---|
| `type` | `'scenario'` | |
| `scenarios` | `Scenario[]` | Evaluated top-to-bottom; first truthy result wins. |

#### Scenario

| Field | Type | Notes |
|---|---|---|
| `scenarioTest` | `(request: MockRequest) => boolean` | Callback that inspects the incoming request and returns `true` when matched. |
| `response` | `StaticResponseProviderConfig \| ScriptResponseProviderConfig \| TemplateResponseProviderConfig \| ProxyResponseProviderConfig` | Response returned when `scenarioTest` is `true`. |

---

## Supporting Types

### MockRequest

Represents the normalised incoming HTTP request passed to routing and scenario-test functions.

| Field | Type | Required | Notes |
|---|---|---|---|
| `method` | `HttpMethod` | yes | |
| `url` | `string` | yes | Full URL including scheme, host, path, and query string. |
| `path` | `string` | yes | Path portion only, without query string. |
| `hostname` | `string` | yes | Host without port. |
| `headers` | `Record<string, string>` | yes | |
| `queryParameters` | `Record<string, string[]>` | yes | Array values support repeated keys (e.g. `?tag=a&tag=b`). |
| `apiName` | `string` | no | Populated after route matching. |
| `body` | `string` | no | Raw request body, if present. |

---

### GlobalVars

A flat string-to-string map of global variables available across the mock runtime.

```ts
type GlobalVars = Record<string, string>;
```

---

## On-Disk Layout

```
<workspace-dir>/
  workspace.json

  <project-name>/
    project.json

    <service-name>/
      service.json
      apis.json
```

---

## Key Invariants

- `Workspace.name`, `Project.name`, and `Service.name` are **set once at creation** and never modified. Rename operations update `displayName` only.
- `Project.name` may contain spaces, numbers, underscores, and dots. No other characters are permitted.
- `Api.name` must be **unique within its parent service**.
- `ProxyResponseProviderConfig.environment` must reference a valid `ServiceEnvironment.name` on the same service.
- `ScenarioResponseProviderConfig` scenarios are tested **in declaration order**; execution stops at the first match.
