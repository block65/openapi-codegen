import * as v from "valibot";

export const inputOnlySchema = v.union([v.string(), v.number()]);
export const onlySchema = v.union([v.pipe(v.string(), v.trim()), v.number()]);
export const inputGetThingCommandResponseSchema = inputOnlySchema;
export const getThingCommandResponseSchema = onlySchema;
