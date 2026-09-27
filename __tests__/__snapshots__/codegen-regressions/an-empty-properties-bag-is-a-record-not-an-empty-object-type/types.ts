import type { Jsonifiable, UndefinedOnPartialDeep } from "type-fest";

export type Empty = Record<string, Jsonifiable>;
export type GetThingCommandInput = never;
export type InputGetThingCommandResponse = UndefinedOnPartialDeep<Empty>;
