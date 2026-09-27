import * as v from "valibot";

export const inputConfigSchema = v.objectWithRest(
    {
        "name": v.optional(v.string())
        ,
    }, v.number());
export const configSchema = v.objectWithRest(
    {
        "name": v.exactOptional(v.pipe(v.string(), v.trim()))
        ,
    }, v.number());
export const inputGetThingCommandResponseSchema = inputConfigSchema;
export const getThingCommandResponseSchema = configSchema;
