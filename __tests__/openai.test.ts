import { expect, test } from "vitest";
import { CreateModerationCommand } from "./fixtures/openai/commands.ts";

// the input is the whole body, so none of it moves to the query or path
test("createModeration sends its input as a JSON body", () => {
	const command = new CreateModerationCommand({ input: "This is a test" });

	expect(command.toJSON()).toStrictEqual({
		method: "post",
		pathname: "/moderations",
		body: JSON.stringify({ input: "This is a test" }),
		query: undefined,
	});
});
