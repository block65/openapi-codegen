import * as v from "valibot";

export const inputStringConstSchema = v.literal("hello");
export const stringConstSchema = inputStringConstSchema;
export const inputNumberConstSchema = v.literal(42);
export const numberConstSchema = inputNumberConstSchema;
export const inputBooleanConstSchema = v.literal(true);
export const booleanConstSchema = inputBooleanConstSchema;
export const inputNullConstSchema = v.null();
export const nullConstSchema = inputNullConstSchema;
