import type { UndefinedOnPartialDeep } from "type-fest";

type CreateContainerCommandJsonBody = {
        "tty"?: boolean;
        "retries"?: number;
        "health"?: {
                "interval"?: bigint;
                "enabled"?: boolean;
            };
        "sizes"?: readonly (number)[];
    };
export type CreateContainerCommandBody = CreateContainerCommandJsonBody;
export type CreateContainerCommandInput = CreateContainerCommandJsonBody;
export type CreateContainerCommandOutput = string | undefined;
export type InputCreateContainerCommandResponse = UndefinedOnPartialDeep<CreateContainerCommandOutput>;
