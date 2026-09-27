import * as v from "valibot";

export const inputBaseSchema = v.looseObject(
    {
        "id": v.optional(v.string())
        ,
    });
export const baseSchema = v.looseObject(
    {
        "id": v.exactOptional(v.pipe(v.string(), v.trim()))
        ,
    });
export const inputNullablesSchema = v.looseObject(
    {
        "object": v.nullable(v.looseObject(
        {
            "id": v.optional(v.string())
            ,
        }))
        ,
        "array": v.nullable(v.array(v.string()))
        ,
        "string": v.nullable(v.string())
        ,
        "stringEnum": v.nullable(v.picklist(["a", "b"]))
        ,
        "unionMember": v.nullable(v.union([v.nullable(v.string()), v.array(v.string())]))
        ,
        "intersectionMember": v.looseObject(
        {
            ...inputBaseSchema
            .entries,
            "name": v.optional(v.string())
            ,
        })
        ,
    });
export const nullablesSchema = v.looseObject(
    {
        "object": v.nullable(v.looseObject(
        {
            "id": v.exactOptional(v.pipe(v.string(), v.trim()))
            ,
        }))
        ,
        "array": v.nullable(v.array(v.pipe(v.string(), v.trim())))
        ,
        "string": v.nullable(v.pipe(v.string(), v.trim()))
        ,
        "stringEnum": v.nullable(v.picklist(["a", "b"]))
        ,
        "unionMember": v.nullable(v.union([v.nullable(v.pipe(v.string(), v.trim())), v.array(v.pipe(v.string(), v.trim()))]))
        ,
        "intersectionMember": v.looseObject(
        {
            ...baseSchema
            .entries,
            "name": v.exactOptional(v.pipe(v.string(), v.trim()))
            ,
        })
        ,
    });
