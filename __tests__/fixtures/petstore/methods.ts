/**
 * This file is auto generated.
 *
 * WARN: Do not edit directly.
 *
 * Generated on 2022-09-07T12:10:34.214Z
 *
 */
import type { Error, ListPetsQuery, RequestMethodCaller } from './models.js';

/**
 * listPets
 * @param params.query.limit? {String} How many items to return at one time (max 100)
 * @returns {RequestMethodCaller<Pets>} HTTP 200
 * @returns {RequestMethodCaller<Error>} HTTP default
 */
export function listPets(params?: {
  query?: ListPetsQuery;
}): RequestMethodCaller<Error> {
  const req = {
    method: 'get' as const,
    pathname: `/pets`,
    query: params?.query,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * createPets
 * @returns {RequestMethodCaller<void>} HTTP 201
 * @returns {RequestMethodCaller<Error>} HTTP default
 */
export function createPets(): RequestMethodCaller<Error> {
  const req = {
    method: 'post' as const,
    pathname: `/pets`,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * showPetById
 * @param petId {String} The id of the pet to retrieve
 * @returns {RequestMethodCaller<Pet>} HTTP 200
 * @returns {RequestMethodCaller<Error>} HTTP default
 */
export function showPetById(petId: string): RequestMethodCaller<Error> {
  const req = {
    method: 'get' as const,
    pathname: `/pets/${petId}`,
  };
  return (requestMethod, options) => requestMethod(req, options);
}
