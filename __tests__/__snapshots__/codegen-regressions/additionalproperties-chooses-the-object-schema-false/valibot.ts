import * as v from "valibot";

export const inputOpenSchema = v.strictObject(
    {
        "a": v.optional(v.string())
        ,
    });
export const openSchema = v.strictObject(
    {
        "a": v.exactOptional(v.pipe(v.string(), v.trim()))
        ,
    });
export const inputGetThingCommandResponseSchema = inputOpenSchema;
export const getThingCommandResponseSchema = openSchema;
