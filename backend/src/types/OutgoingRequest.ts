/** Represents the mutable outgoing request that will be forwarded to the downstream service. */
export interface OutgoingRequest {
  /** Full URL to forward to (targetUrl + path, no query string). */
  url: string;
  method: string;
  headers: Record<string, string>;
  queryParameters: Record<string, string[]>;
  body?: string;
}
