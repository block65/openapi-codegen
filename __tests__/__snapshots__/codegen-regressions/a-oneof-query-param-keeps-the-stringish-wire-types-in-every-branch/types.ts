import type { UndefinedOnPartialDeep } from "type-fest";

export type ListThingsCommandQuery = {
        size?: `${number}` | string;
        flag?: "true" | "false" | string;
        nested?: {
                "count"?: `${number}` | string;
            };
    };
export type ListThingsCommandInput = ListThingsCommandQuery;
export type ListThingsCommandOutput = string | undefined;
export type InputListThingsCommandResponse = UndefinedOnPartialDeep<ListThingsCommandOutput>;
