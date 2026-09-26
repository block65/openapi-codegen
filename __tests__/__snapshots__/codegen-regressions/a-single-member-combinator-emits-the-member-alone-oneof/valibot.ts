import * as v from "valibot";

export const inputOnlySchema = v.string();
export const onlySchema = v.pipe(v.string(), v.trim());
export const inputGetThingCommandResponseSchema = inputOnlySchema;
export const getThingCommandResponseSchema = onlySchema;
