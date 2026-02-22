import { Api, HttpMethod, MockProviderConfig } from '@carbon/shared';

/**
 * A compiled version of an Api whose urlPattern regex is pre-built once at
 * cache-load time rather than on every incoming request.
 */
export class CompiledApi {
  readonly name: string;
  readonly description: string;
  readonly method: HttpMethod;
  readonly urlPattern: string;
  readonly providers: MockProviderConfig[];

  private readonly urlRegex: RegExp | null;

  constructor(api: Api) {
    this.name = api.name;
    this.description = api.description;
    this.method = api.method;
    this.urlPattern = api.urlPattern;
    this.providers = api.providers;

    try {
      this.urlRegex = new RegExp(api.urlPattern);
    } catch {
      // Invalid regex in config — testUrl() will always return false.
      this.urlRegex = null;
    }
  }

  /** Returns true when the compiled urlPattern regex matches the given path. */
  testUrl(path: string): boolean {
    return this.urlRegex?.test(path) ?? false;
  }
}
