/** A named host URL associated with a specific environment (e.g. staging, production). */
export interface ServiceEnvironment {
  name: string;
  host: string;
  useProxyAuth?: boolean;
}

export interface Service {
  /** Immutable identifier used as the directory name. Cannot be changed after creation. */
  name: string;
  /** Human-readable label shown in the UI. Can be updated freely. */
  displayName: string;
  description?: string;
  /** Hostname this service is associated with (e.g. "api.example.com"). */
  hostname?: string;
  /** When true, incoming requests must carry a Host header matching `hostname` to be routed to this service. */
  matchHostName?: boolean;
  /** Optional per-environment proxy targets for this service. */
  environments?: ServiceEnvironment[];
  injectLatencyMs?: number;
}
