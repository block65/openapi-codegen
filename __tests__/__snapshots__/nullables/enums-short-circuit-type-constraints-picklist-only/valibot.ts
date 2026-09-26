import * as v from "valibot";

export const inputIntegerEnumSchema = v.picklist([0, 1, 2]);
export const integerEnumSchema = inputIntegerEnumSchema;
export const inputStringEnumSchema = v.picklist(["a@example.com", "b@example.com"]);
export const stringEnumSchema = inputStringEnumSchema;
