import * as v from "valibot";
export const inputLeafSchema = v.strictObject(
    {
        "name": v.optional(v.string())
        ,
    });
export const leafSchema = v.strictObject(
    {
        "name": v.exactOptional(v.pipe(v.string(), v.trim()))
        ,
    });
export const inputInUnionBesidePropertiesSchema = v.looseObject(
    {
        ...inputLeafSchema
        .entries,
    });
export const inUnionBesidePropertiesSchema = v.looseObject(
    {
        ...leafSchema
        .entries,
    });
export const inputInRecordSchema = v.record(v.string(), inputLeafSchema);
export const inRecordSchema = inputInRecordSchema;
export const inputInArrayItemSchema = v.array(v.looseObject(
    {
        "leaf": v.optional(inputLeafSchema)
        ,
    }));
export const inArrayItemSchema = v.array(v.looseObject(
    {
        "leaf": v.exactOptional(leafSchema)
        ,
    }));
