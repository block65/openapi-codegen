import type { UndefinedOnPartialDeep } from "type-fest";

type CreateBatchJsonBody = {
        "input_file_id"?: string;
    };
export type CreateBatchCommandBody = CreateBatchJsonBody;
export type CreateBatchCommandInput = CreateBatchJsonBody;
export type CreateBatchCommandOutput = string | undefined;
export type InputCreateBatchCommandResponse = UndefinedOnPartialDeep<CreateBatchCommandOutput>;
