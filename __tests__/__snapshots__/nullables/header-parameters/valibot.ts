import * as v from "valibot";

export const inputUploadStatusSchema = v.picklist(["pending", "complete"]);
export const uploadStatusSchema = inputUploadStatusSchema;
export const inputUploadDataCommandResponseSchema = inputUploadStatusSchema;
export const uploadDataCommandResponseSchema = uploadStatusSchema;
export const inputUploadDataCommandParamsSchema = v.strictObject({
        "uploadId": v.string()
    });
export const uploadDataCommandParamsSchema = v.strictObject({
        "uploadId": v.pipe(v.string(), v.trim())
    });
export const inputUploadDataCommandHeaderSchema = v.object({
        "content-type": v.picklist(["application/json", "text/csv", "application/xml"]),
        "content-length": v.bigint(),
        "x-idempotency-key": v.optional(v.pipe(v.string(), v.uuid()))
    });
export const uploadDataCommandHeaderSchema = v.object({
        "content-type": v.picklist(["application/json", "text/csv", "application/xml"]),
        "content-length": v.union([v.pipe(v.string(), v.decimal(), v.toBigint(), v.bigint()), v.pipe(v.number(), v.integer(), v.toBigint(), v.bigint()), v.bigint()]),
        "x-idempotency-key": v.exactOptional(v.pipe(v.string(), v.uuid()))
    });
