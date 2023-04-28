/**
 * This file is auto generated.
 *
 * WARN: Do not edit directly.
 *
 * Generated on 2023-04-28T03:10:34.140Z
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
type FindPetsCommandInputRest = Record<string, unknown> & FindPetsCommandQuery;
export type AddPetCommandParams = {
  parameters: string;
};
export type AddPetCommandInput = NewPet &
  Record<string, unknown> &
  AddPetCommandParams;
type AddPetCommandInputRest = NewPet & Record<string, unknown>;
export type FindPetByIdCommandParams = {
  id: string;
};
export type FindPetByIdCommandInput = Record<string, unknown> &
  Record<string, unknown> &
  FindPetByIdCommandParams;
type FindPetByIdCommandInputRest = Record<string, unknown> &
  Record<string, unknown>;
export type DeletePetCommandParams = {
  id: string;
};
export type DeletePetCommandInput = Record<string, unknown> &
  Record<string, unknown> &
  DeletePetCommandParams;
type DeletePetCommandInputRest = Record<string, unknown> &
  Record<string, unknown>;
