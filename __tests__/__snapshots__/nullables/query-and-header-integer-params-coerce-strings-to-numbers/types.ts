import type { UndefinedOnPartialDeep } from "type-fest";

export type Dummy = string;
export type ExpireTime = bigint;
export type ListFilesCommandQuery = {
        exp: `${bigint}`;
        limit?: `${number}`;
    };
export type ListFilesCommandHeader = {
        "x-rate-limit": `${number}`;
    };
export type ListFilesCommandInput = ListFilesCommandQuery;
export type InputListFilesCommandResponse = UndefinedOnPartialDeep<Dummy>;
