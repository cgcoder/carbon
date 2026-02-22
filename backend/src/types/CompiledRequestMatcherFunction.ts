import { RequestMatcherFunction, MockRequest } from '@carbon/shared';

export class CompiledRequestMatcherFunction {
  readonly isCatchAll: boolean;
  private readonly fn?: (request: MockRequest) => boolean;

  constructor(matcher: RequestMatcherFunction) {
    this.isCatchAll = matcher.body.trim().length === 0;
    if (!this.isCatchAll) {
      try {
        // eslint-disable-next-line no-new-func
        this.fn = new Function('request', matcher.body) as (request: MockRequest) => boolean;
      } catch (e) {
        // Syntax error; fn stays undefined and matches() will return false.
        console.error('Error compiling matcher function:', e);
      }
    }
  }

  /**
   * Evaluates the matcher against the given request.
   * Returns true for catch-alls, false if the function failed to compile or threw at runtime.
   */
  matches(request: unknown): boolean {
    if (this.isCatchAll) return true;
    if (!this.fn) return false;
    try {
      return !!this.fn(request as MockRequest);
    } catch {
      return false;
    }
  }
}
