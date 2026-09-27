import type { JsonValue } from "type-fest";

export type Open = {
        "anything": JsonValue;
        "record": Record<string, JsonValue>;
        "list": readonly (JsonValue)[];
    };
