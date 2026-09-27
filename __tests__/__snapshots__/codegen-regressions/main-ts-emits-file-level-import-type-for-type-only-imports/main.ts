import { RestServiceClient, type RestServiceClientConfig } from "@block65/rest-client";
import type { UndefinedOnPartialDeep } from "type-fest";
import type { OneCommandInput, OneCommandOutput } from "./types.js";

export { ResponseValidationError } from "@block65/rest-client";

type AllInputs = UndefinedOnPartialDeep<OneCommandInput>;
type AllOutputs = OneCommandOutput;

export class TestRestClient extends RestServiceClient<AllInputs, AllOutputs> {
    constructor(baseUrl: string | URL = new URL('https://api.example.com/'), config?: RestServiceClientConfig) {
        super(baseUrl, config);
    }
}
