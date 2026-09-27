import * as v from "valibot";

export const inputOpenSchema = v.objectWithRest(
    {
        "a": v.optional(v.string())
        ,
    }, v.string());
export const openSchema = v.objectWithRest(
    {
        "a": v.exactOptional(v.pipe(v.string(), v.trim()))
        ,
    }, v.pipe(v.string(), v.trim()));
export const inputGetThingCommandResponseSchema = inputOpenSchema;
export const getThingCommandResponseSchema = openSchema;
