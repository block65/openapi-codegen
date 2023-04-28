/**
 * This file is auto generated by @block65/openapi-codegen
 *
 * WARN: Do not edit directly.
 *
 * Generated on 2023-04-28T04:48:42.883Z
 *
 */
export type NewPet = {
  name: string;
  tag?: string | undefined;
};
export type Error = {
  code: number;
  message: string;
};
export type Pet = NewPet & {
  id: number;
};
export type FindPetsCommandQuery = {
  tags: string[];
  limit: `${number}`;
};
export type FindPetsCommandParams = {
  parameters: string;
};
export type FindPetsCommandInput = Record<string, unknown> &
  FindPetsCommandQuery &
  FindPetsCommandParams;
export type FindPetsCommandBody = Record<string, unknown> &
  FindPetsCommandQuery;
export type AddPetCommandParams = {
  parameters: string;
};
export type AddPetCommandInput = NewPet &
  Record<string, unknown> &
  AddPetCommandParams;
export type AddPetCommandBody = NewPet & Record<string, unknown>;
export type FindPetByIdCommandParams = {
  id: string;
};
export type FindPetByIdCommandInput = Record<string, unknown> &
  Record<string, unknown> &
  FindPetByIdCommandParams;
export type FindPetByIdCommandBody = Record<string, unknown> &
  Record<string, unknown>;
export type DeletePetCommandParams = {
  id: string;
};
export type DeletePetCommandInput = Record<string, unknown> &
  Record<string, unknown> &
  DeletePetCommandParams;
export type DeletePetCommandBody = Record<string, unknown> &
  Record<string, unknown>;