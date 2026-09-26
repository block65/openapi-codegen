import { RestServiceClient, type RestServiceClientConfig } from "@block65/rest-client";
import type { UndefinedOnPartialDeep } from "type-fest";
import type { AlphaCommandOutput, BetaCommandOutput, GammaCommandOutput, WithBodyCommandInput, WithBodyCommandOutput, WithQueryCommandInput, WithQueryCommandOutput } from "./types.js";

export { ResponseValidationError } from "@block65/rest-client";

type AllInputs = UndefinedOnPartialDeep<WithBodyCommandInput> | UndefinedOnPartialDeep<WithQueryCommandInput>;
type AllOutputs = AlphaCommandOutput | BetaCommandOutput | GammaCommandOutput | WithBodyCommandOutput | WithQueryCommandOutput;

export class TestRestClient extends RestServiceClient<AllInputs, AllOutputs> {
    constructor(baseUrl: string | URL = new URL('https://api.example.com/'), config?: RestServiceClientConfig) {
        super(baseUrl, config);
    }
}
