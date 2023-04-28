import {
  type RequestMethod,
  type RequestMethodCaller,
  type RuntimeOptions,
} from '@block65/rest-client/legacy';

export class LegacyRestClient {
  #requestMethod: RequestMethod;

  constructor(opts: { requestMethod: RequestMethod }) {
    this.#requestMethod = opts.requestMethod;
  }

  public send<T>(
    fn: RequestMethodCaller<T>,
    options?: RuntimeOptions,
  ): Promise<T> {
    return fn(this.#requestMethod, options);
  }
}
