import { Command, stripUndefined, jsonStringify } from "@block65/rest-client";
import type { UndefinedOnPartialDeep } from "type-fest";
import type { PluginPullCommandQuery, PluginPullCommandInput, PluginPullCommandOutput } from "./types.js";


/**
 * PluginPullCommand
 *
 */
export class PluginPullCommand extends Command<UndefinedOnPartialDeep<PluginPullCommandInput>, PluginPullCommandOutput, PluginPullCommandQuery> {
    public override method = "post" as const;

    constructor(input: UndefinedOnPartialDeep<PluginPullCommandInput>) {
        const {remote, body } = input;
        super("/plugins/pull", jsonStringify(body), stripUndefined({remote}));
    }
}
