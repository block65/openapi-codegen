import type { UndefinedOnPartialDeep } from "type-fest";

export type SearchCommandQuery = {
        limit?: `${number}`;
        filter?: {
                "age"?: `${number}`;
                "big"?: `${bigint}`;
                "active"?: "true" | "false";
                "label"?: string;
            };
        ids?: readonly (`${number}`)[];
    };
export type SearchCommandInput = SearchCommandQuery;
export type SearchCommandOutput = string | undefined;
export type InputSearchCommandResponse = UndefinedOnPartialDeep<SearchCommandOutput>;
