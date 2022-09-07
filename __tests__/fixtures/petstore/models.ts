/**
 * This file is auto generated.
 *
 * WARN: Do not edit directly.
 *
 * Generated on 2022-09-07T12:10:34.214Z
 *
 */
export type HttpMethod = 'get' | 'post' | 'put' | 'delete' | 'head';
export type RequestParams = {
  pathname: string;
  method: HttpMethod;
  query?: Record<string, string | number> | undefined;
  body?: unknown;
  headers?: Record<string, string>;
};
export type RuntimeOptions = {
  signal?: AbortSignal;
};
export type RequestMethod<T = any> = (
  params: RequestParams,
  options?: RuntimeOptions,
) => Promise<T>;
export type RequestMethodCaller<T = unknown> = (
  requestMethod: RequestMethod<T>,
  options?: RuntimeOptions,
) => Promise<T>;
export type Pet = {
  id: number;
  name: string;
  tag?: string;
};
export type Pets = Pet[];
export type Error = {
  code: number;
  message: string;
};
export type ListPetsQuery = {
  limit?: never;
};
