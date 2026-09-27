import * as v from "valibot";

export const inputDummySchema = v.string();
export const dummySchema = v.pipe(v.string(), v.trim());
export const inputExpireTimeSchema = v.pipe(v.bigint(), v.minValue(0n));
export const expireTimeSchema = v.union([v.pipe(v.string(), v.decimal(), v.toBigint(), v.pipe(v.bigint(), v.minValue(0n))), v.pipe(v.number(), v.integer(), v.toBigint(), v.pipe(v.bigint(), v.minValue(0n))), v.pipe(v.bigint(), v.minValue(0n))]);
export const inputListFilesCommandResponseSchema = inputDummySchema;
export const listFilesCommandResponseSchema = dummySchema;
export const inputListFilesCommandQuerySchema = v.strictObject({
        "exp": v.pipe(v.bigint(), v.minValue(0n)),
        "limit": v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(100)))
    });
export const listFilesCommandQuerySchema = v.strictObject({
        "exp": v.union([v.pipe(v.string(), v.decimal(), v.toBigint(), v.pipe(v.bigint(), v.minValue(0n))), v.pipe(v.number(), v.integer(), v.toBigint(), v.pipe(v.bigint(), v.minValue(0n))), v.pipe(v.bigint(), v.minValue(0n))]),
        "limit": v.exactOptional(v.union([v.pipe(v.string(), v.decimal(), v.toNumber(), v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(100))), v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(100))]))
    });
export const inputListFilesCommandHeaderSchema = v.object({
        "x-rate-limit": v.pipe(v.number(), v.integer(), v.minValue(0))
    });
export const listFilesCommandHeaderSchema = v.object({
        "x-rate-limit": v.union([v.pipe(v.string(), v.decimal(), v.toNumber(), v.pipe(v.number(), v.integer(), v.minValue(0))), v.pipe(v.number(), v.integer(), v.minValue(0))])
    });
