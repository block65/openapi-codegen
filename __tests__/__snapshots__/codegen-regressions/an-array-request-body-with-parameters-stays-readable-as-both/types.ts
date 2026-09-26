import type { UndefinedOnPartialDeep } from "type-fest";

export type PluginPullCommandQuery = {
        remote: string;
    };
type PluginPullCommandJsonBody = readonly (string)[];
export type PluginPullCommandBody = PluginPullCommandJsonBody;
type PluginPullCommandBodyWrapper = {
        body: PluginPullCommandJsonBody;
    };
export type PluginPullCommandInput = PluginPullCommandBodyWrapper & PluginPullCommandQuery;
export type PluginPullCommandOutput = string | undefined;
export type InputPluginPullCommandResponse = UndefinedOnPartialDeep<PluginPullCommandOutput>;
