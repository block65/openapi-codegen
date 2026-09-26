import * as v from "valibot";

export const inputNameSchema = v.pipe(v.string(), v.minLength(1));
export const inputAmountSchema = v.pipe(v.bigint(), v.minValue(0n));
