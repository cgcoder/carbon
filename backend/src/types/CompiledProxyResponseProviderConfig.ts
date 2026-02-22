import { ProxyResponseProviderConfig, MockRequest } from '@carbon/shared';
import { OutgoingRequest } from './OutgoingRequest';

/**
 * Backend-only extension of ProxyResponseProviderConfig that carries the pre-compiled
 * version of responseBuilderScript. The compiled function is built once at cache-load
 * time so it is not re-parsed on every request.
 */
export interface CompiledProxyResponseProviderConfig extends ProxyResponseProviderConfig {
  /**
   * Compiled form of responseBuilderScript.
   * Called with (mockRequest, proxyRequest) before the downstream request is sent.
   * Mutate `proxyRequest` properties (url, method, headers, queryParameters, body) as needed.
   * Absent when responseBuilderScript is not configured or failed to compile.
   */
  outgoingRequestBuilderCompiledFn?: (mockRequest: MockRequest, proxyRequest: OutgoingRequest) => void;
  responseBuilderScriptCompiledFn?: (mockRequest: MockRequest, proxyRequest: OutgoingRequest, response: unknown) => void;
}
