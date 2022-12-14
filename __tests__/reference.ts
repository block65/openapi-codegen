/* eslint-disable no-underscore-dangle */
/// <reference lib="dom" />

import type {
  RequestMethod,
  RequestMethodCaller,
  RuntimeOptions,
} from './fixtures/petstore/models.js';

export class ReferenceServiceClient {
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
