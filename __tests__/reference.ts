/* eslint-disable no-underscore-dangle */
/// <reference lib="dom" />

import { listPets } from './fixtures/petstore/methods.js';
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

const client = new ReferenceServiceClient({
  requestMethod: (params, { signal } = {}) => {
    const { pathname, method, query, body, headers = {} } = params;

    const url = new URL(pathname, 'https://api.example.com');
    url.search = query
      ? new URLSearchParams(
          Object.entries(query).map(([k, v]) => [k, v.toString()]),
        ).toString()
      : '';

    return fetch(url, {
      method,
      body: JSON.stringify(body) || null,
      headers,
      signal: signal || null,
    });
  },
});

await client.send(listPets());
