import type { UndefinedOnPartialDeep } from "type-fest";

export type UploadStatus = "pending" | "complete";
export type UploadDataCommandHeader = {
        "content-type": "application/json" | "text/csv" | "application/xml";
        "content-length": `${bigint}`;
        "x-idempotency-key"?: string;
    };
export type UploadDataCommandParams = {
        uploadId: string;
    };
export type UploadDataCommandInput = UploadDataCommandParams;
export type InputUploadDataCommandResponse = UndefinedOnPartialDeep<UploadStatus>;
