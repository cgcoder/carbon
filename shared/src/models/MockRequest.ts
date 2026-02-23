import { HttpMethod } from './HttpMethod';

export interface MockRequestPart {
  name: string;
  filename?: string;
  contentType: string;
  data: string;       // UTF-8 text or base64-encoded binary
  isBase64: boolean;
}

export interface MockRequest {
  /** HTTP method of the incoming request. */
  method: HttpMethod;
  /** Full URL including scheme, hostname, path and query string. */
  url: string;
  /** Path portion of the URL (without query string). */
  path: string;
  /** Hostname extracted from the request (without port). */
  hostname: string;
  /** Incoming request headers. */
  headers: Record<string, string>;
  /** Parsed query parameters. Values are arrays to support repeated keys (e.g. ?tag=a&tag=b). */
  queryParameters: Record<string, string[]>;
  /** Name of the matched Api within the service. Populated after route matching. */
  apiName?: string;
  /** Raw request body, if present. */
  body?: string;
  /** Parsed multipart/form-data parts, if the request was multipart. */
  multipartParts?: MockRequestPart[];
  requestNumber: number; // Incrementing counter for each request received by the service, used for debugging and testing purposes.
  /** ISO 8601 timestamp of when the request was received. */
  timestamp: string;
}
