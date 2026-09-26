import * as v from "valibot";

export const inputNullableStringSchema = v.nullable(v.string());
export const nullableStringSchema = inputNullableStringSchema;
export const inputNullableStringEnumSchema = v.nullable(v.picklist(["active", "inactive"]));
export const nullableStringEnumSchema = inputNullableStringEnumSchema;
export const inputNullableIntegerSchema = v.nullable(v.pipe(v.number(), v.integer()));
export const nullableIntegerSchema = inputNullableIntegerSchema;
export const inputMultiTypeSchema = v.union([v.string(), v.number()]);
export const multiTypeSchema = inputMultiTypeSchema;
