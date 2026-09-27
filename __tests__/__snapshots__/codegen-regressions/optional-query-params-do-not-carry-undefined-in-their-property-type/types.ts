import type { UndefinedOnPartialDeep } from "type-fest";

export type ListFilesCommandQuery = {
        purpose?: string;
        limit?: `${number}`;
    };
export type ListFilesCommandInput = ListFilesCommandQuery;
export type ListFilesCommandOutput = string | undefined;
export type InputListFilesCommandResponse = UndefinedOnPartialDeep<ListFilesCommandOutput>;
