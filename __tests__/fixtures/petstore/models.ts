/**
 * This file is auto generated.
 *
 * WARN: Do not edit directly.
 *
 * Generated on 2023-03-29T04:57:18.928Z
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
