/**
 * This file is auto generated.
 *
 * WARN: Do not edit directly.
 *
 * Generated on 2022-10-29T14:54:27.697Z
 *
 */
export type HttpMethod = 'get' | 'post' | 'put' | 'delete' | 'head';
export type RequestParameters = {
  pathname: string;
  method: HttpMethod;
  query?: Record<string, string | number | string[] | number[]> | undefined;
  body?: unknown;
  headers?: Record<string, string>;
};
export type RuntimeOptions = {
  signal?: AbortSignal;
};
export type RequestMethod<T = any> = (
  params: RequestParameters,
  options?: RuntimeOptions,
) => Promise<T>;
export type RequestMethodCaller<T = unknown> = (
  requestMethod: RequestMethod<T>,
  options?: RuntimeOptions,
) => Promise<T>;
export type NewPet = {
  name: string;
  tag?: string;
};
export type Error = {
  code: number;
  message: string;
};
export type Pet = NewPet & {
  id: number;
};
export type FindPetsQuery = {
  tags?: string[];
  limit?: number;
};
