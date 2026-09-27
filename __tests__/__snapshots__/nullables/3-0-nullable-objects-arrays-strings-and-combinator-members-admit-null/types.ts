export type Base = {
        "id"?: string;
    };
export type Nullables = {
        "object": {
                "id"?: string;
            } | null;
        "array": readonly (string)[] | null;
        "string": string | null;
        "stringEnum": "a" | "b" | null;
        "unionMember": string | readonly (string)[] | null;
        "intersectionMember": Base & {
                "name"?: string;
            };
    };
