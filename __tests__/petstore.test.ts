import { MockAgent, fetch as undiciFetch } from "undici";
import { describe, expect, test, vi } from "vitest";
import { FindPetsCommand } from "./fixtures/petstore/commands.ts";
import { SwaggerPetstoreRestClient } from "./fixtures/petstore/main.ts";

const mockAgent = new MockAgent();
mockAgent.disableNetConnect();

const apiUrl = "http://192.2.0.1";

describe("Petstore", () => {
	const pool = mockAgent.get(apiUrl);

	const bodySpy = vi.fn((_body: string) => ({ ok: true }));

	pool
		.intercept({
			path: "/pets?tags=tag1%2Ctag2&limit=10",
			method: "GET",
			body(body) {
				bodySpy(body);
				return true;
			},
		})
		.reply(200, { ok: 1 })
		.times(1);

	test("find pets", async () => {
		const petStoreClient = new SwaggerPetstoreRestClient(apiUrl, {
			logger: console.log,
			fetch: (input, init) =>
				undiciFetch(input, { ...init, dispatcher: mockAgent }),
		});
		const command = new FindPetsCommand({
			limit: "10",
			tags: ["tag1", "tag2"],
		});

		const result = await petStoreClient.json(command).catch((err) => err);

		expect(result).toBeTruthy();
	});
});
