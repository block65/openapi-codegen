import type { FindPetsCommandQuery, Pet, NewPet } from './models.js';
import type { Simplify } from 'type-fest';
import type {
  RuntimeOptions,
  RequestMethod,
  RequestMethodCaller,
} from '@block65/rest-client';

/**
 * Returns all pets from the system that the user has access to
 * Nam sed condimentum est. Maecenas tempor sagittis sapien, nec rhoncus sem
 * sagittis sit amet. Aenean at gravida augue, ac iaculis sem. Curabitur odio
 * lorem, ornare eget elementum nec, cursus id lectus. Duis mi turpis,
 * pulvinar ac eros ac, tincidunt varius justo. In hac habitasse platea
 * dictumst. Integer at adipiscing ante, a sagittis ligula. Aenean pharetra
 * tempor ante molestie imperdiet. Vivamus id aliquam diam. Cras quis velit
 * non tortor eleifend sagittis. Praesent at enim pharetra urna volutpat
 * venenatis eget eget mauris. In eleifend fermentum facilisis. Praesent enim
 * enim, gravida ac sodales sed, placerat id erat. Suspendisse lacus dolor,
 * consectetur non augue vel, vehicula interdum libero. Morbi euismod sagittis
 * libero sed lacinia.
 *
 * Sed tempus felis lobortis leo pulvinar rutrum. Nam mattis velit nisl, eu
 * condimentum ligula luctus nec. Phasellus semper velit eget aliquet
 * faucibus. In a mattis elit. Phasellus vel urna viverra, condimentum lorem
 * id, rhoncus nibh. Ut pellentesque posuere elementum. Sed a varius odio.
 * Morbi rhoncus ligula libero, vel eleifend nunc tristique vitae. Fusce et
 * sem dui. Aenean nec scelerisque tortor. Fusce malesuada accumsan magna vel
 * tempus. Quisque mollis felis eu dolor tristique, sit amet auctor felis
 * gravida. Sed libero lorem, molestie sed nisl in, accumsan tempor nisi.
 * Fusce sollicitudin massa ut lacinia mattis. Sed vel eleifend lorem.
 * Pellentesque vitae felis pretium, pulvinar elit eu, euismod sapien.
 * @param parameters.query.tags? {String} tags to filter by
 * @param parameters.query.limit? {String} maximum number of results to return
 * @returns {RequestMethodCaller<Pet[]>} HTTP 200
 */
export function findPetsCommand(parameters?: {
  query?: FindPetsCommandQuery;
}): RequestMethodCaller<Pet[]> {
  const req = {
    method: 'get' as const,
    pathname: `/pets`,
    query: parameters?.query,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * Creates a new pet in the store. Duplicates are allowed
 * @param parameters.body {NewPet}
 * @returns {RequestMethodCaller<Pet>} HTTP 200
 */
export function addPetCommand(parameters: {
  body: Simplify<NewPet>;
}): RequestMethodCaller<Pet> {
  const req = {
    method: 'post' as const,
    pathname: `/pets`,
    body: parameters.body,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * Returns a user based on a single ID, if the user does not have access to
 * the pet
 * @param id {String} ID of pet to fetch
 * @returns {RequestMethodCaller<Pet>} HTTP 200
 */
export function findPetByIdCommand(id: string): RequestMethodCaller<Pet> {
  const req = {
    method: 'get' as const,
    pathname: `/pets/${id}`,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * deletes a single pet based on the ID supplied
 * @param id {String} ID of pet to delete
 */
export function deletePetCommand(id: string): RequestMethodCaller<void> {
  const req = {
    method: 'delete' as const,
    pathname: `/pets/${id}`,
  };
  return (requestMethod, options) => requestMethod(req, options);
}
