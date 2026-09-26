import { Command } from "@block65/rest-client";
import type { UndefinedOnPartialDeep } from "type-fest";
import type { SystemAuthCommandInput, SystemAuthCommandOutput } from "./types.js";


/**
 * SystemAuthCommand
 *
 */
export class SystemAuthCommand extends Command<UndefinedOnPartialDeep<SystemAuthCommandInput>, SystemAuthCommandOutput> {
    public override method = "post" as const;

    constructor() {
        super("/auth");
    }
}
