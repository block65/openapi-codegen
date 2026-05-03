import { MockAgent, fetch as undiciFetch } from "undici";
import { describe, expect, test } from "vitest";
import { CreateModerationCommand } from "./fixtures/openai/commands.ts";
import { OpenAiApiRestClient } from "./fixtures/openai/main.ts";

const mockAgent = new MockAgent();
mockAgent.disableNetConnect();

const apiUrl = "http://192.2.0.1";

describe("OpenAI", () => {
	const pool = mockAgent.get(apiUrl);

	pool
		.intercept({
			path: "/moderations",
			method: "POST",
		})
		.reply(200, {
			id: "modr-123",
			model: "text-moderation-latest",
			results: [],
		})
		.times(1);

	test("CreateModeration", async () => {
		const openAiClient = new OpenAiApiRestClient(apiUrl, {
			logger: console.debug,
			fetch: (input, init) =>
				undiciFetch(
					// @ts-expect-error @types/node resolves fetch types via undici-types@7, but we
					// import undici@8 directly — Request.headers.keys() iterator types diverge.
					// Fix: remove when @types/node ships undici-types@8
					input,
					{ ...init, dispatcher: mockAgent },
				),
		});

		const command = new CreateModerationCommand({
			input: "This is a test",
		});

		const result = await openAiClient.json(command);

		expect(result).toBeTruthy();
	});
});
