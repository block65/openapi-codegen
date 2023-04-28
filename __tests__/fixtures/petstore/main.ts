/**
 * This file is auto generated by @block65/openapi-codegen
 *
 * WARN: Do not edit directly.
 *
 * Generated on 2023-04-28T12:24:51.108Z
 *
 */
import {
  RestServiceClient,
  createIsomorphicFetcher,
  type RestServiceClientConfig,
} from '@block65/rest-client';
import {
  type FindPetsCommandInput,
  type AddPetCommandInput,
  type FindPetByIdCommandInput,
  type DeletePetCommandInput,
  type Pet,
} from './types.js';

type AllInputs =
  | FindPetsCommandInput
  | AddPetCommandInput
  | FindPetByIdCommandInput
  | DeletePetCommandInput;
type AllOutputs = Pet;

export class SwaggerPetstoreRestClient extends RestServiceClient<
  AllInputs,
  AllOutputs
> {
  constructor(
    fetcher = createIsomorphicFetcher(),
    config?: RestServiceClientConfig,
  ) {
    super(new URL('http://petstore.swagger.io/api/'), fetcher, config);
  }
}
