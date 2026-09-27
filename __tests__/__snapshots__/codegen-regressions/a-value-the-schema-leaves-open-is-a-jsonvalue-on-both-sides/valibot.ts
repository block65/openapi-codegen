import * as v from "valibot";
import type { JsonValue } from "type-fest";

const jsonValueSchema: v.GenericSchema<JsonValue> = v.lazy(() => v.union([v.string(), v.number(), v.boolean(), v.null(), v.record(v.string(), jsonValueSchema), v.array(jsonValueSchema)]));
export const inputOpenSchema = v.strictObject(
    {
        "anything": jsonValueSchema
        ,
        "record": v.record(v.string(), jsonValueSchema)
        ,
        "list": v.array(jsonValueSchema)
        ,
    });
export const openSchema = inputOpenSchema;
