import { expect, test } from "vitest";
import { FindPetsCommand } from "./fixtures/petstore/commands.ts";

test("findPets carries its method, path and query", () => {
	const command = new FindPetsCommand({ limit: "10", tags: ["tag1", "tag2"] });

	expect(command.toJSON()).toStrictEqual({
		method: "get",
		pathname: "/pets",
		body: undefined,
		query: { tags: ["tag1", "tag2"], limit: "10" },
	});
});
