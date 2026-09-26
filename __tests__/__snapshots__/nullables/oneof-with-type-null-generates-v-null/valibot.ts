import * as v from "valibot";

export const inputNullableImageSchema = v.union([v.string(), v.null()]);
export const nullableImageSchema = v.union([v.pipe(v.string(), v.trim()), v.null()]);
