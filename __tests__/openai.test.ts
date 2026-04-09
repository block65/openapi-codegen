import { MockAgent, setGlobalDispatcher } from "undici";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { CreateModerationCommand } from "./fixtures/openai/commands.ts";
import { OpenAiApiRestClient } from "./fixtures/openai/main.ts";

const mockAgent = new MockAgent();
setGlobalDispatcher(mockAgent);

beforeAll(() => {
	mockAgent.activate();
	mockAgent.disableNetConnect();
});

afterAll(() => {
	mockAgent.assertNoPendingInterceptors();
});

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
		});

		const command = new CreateModerationCommand({
			input: "This is a test",
		});

		const result = await openAiClient.json(command);

		expect(result).toBeTruthy();
	});
});
