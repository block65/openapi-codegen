import * as commands from "./commands.js";
import * as schemas from "./valibot.js";

export class UploadDataCommand extends commands.UploadDataCommand {
    static responseSchema = schemas.uploadDataCommandResponseSchema;
}
