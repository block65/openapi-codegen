import { Command } from "@block65/rest-client";
import type { UndefinedOnPartialDeep } from "type-fest";
import type { UploadDataCommandHeader, UploadDataCommandInput, UploadStatus } from "./types.js";

/**
 * Tagged template literal that applies encodeURIComponent to all interpolated 
 * values, protecting path integrity from characters like `/` and `#`.
 * @example encodePath`/users/${userId}` // "/users/foo%2Fbar"
 */
function encodePath(strings: TemplateStringsArray, ...values: string[]) {
    return String.raw({ raw: strings }, ...values.map((value) => encodeURIComponent(value)));
}

/**
 * UploadDataCommand
 *
 */
export class UploadDataCommand extends Command<UndefinedOnPartialDeep<UploadDataCommandInput>, UploadStatus, never, UploadDataCommandHeader> {
    public override method = "post" as const;

    constructor(input: UndefinedOnPartialDeep<UploadDataCommandInput>, headers: UploadDataCommandHeader) {
        const {uploadId } = input;
        super(encodePath`/uploads/${uploadId}`, undefined, undefined, headers);
    }
}
