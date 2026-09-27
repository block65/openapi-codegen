import {
	createIsomorphicNativeFetcher,
	type ParsedStreamEvent,
} from "@block65/rest-client";
import { MockAgent, fetch as undiciFetch } from "undici";
import { describe, expect, expectTypeOf, test, vi } from "vitest";
import {
	GetBillingAccountCommand,
	ListBillingAccountsCommand,
	StreamOperationEventsCommand,
} from "./fixtures/test1/commands.ts";
import { BillingServiceRestApiRestClient } from "./fixtures/test1/main.ts";
import type { StreamOperationEventsCommandOutput } from "./fixtures/test1/types.ts";

const mockAgent = new MockAgent();
mockAgent.disableNetConnect();

const apiUrl = "http://192.2.0.1";

describe("Test1", () => {
	const pool = mockAgent.get(apiUrl);

	const bodySpy = vi.fn<(body: string) => { ok: boolean }>(() => ({
		ok: true,
	}));

	pool
		.intercept({
			path: "/billing-accounts/1234",
			method: "GET",
			body(body) {
				bodySpy(body);
				return true;
			},
		})
		.reply(200, { ok: 1 })
		.times(1);

	const operationId = "00000000-0000-4000-8000-000000000000";

	pool
		.intercept({ path: `/operations/${operationId}/events`, method: "GET" })
		.reply(200, 'event: heartbeat\ndata: {"sequence":1}\n\n', {
			headers: { "content-type": "text/event-stream" },
		})
		.times(1);

	test("zero-input command has correct pathname", () => {
		const command = new ListBillingAccountsCommand();
		expect(command.pathname).toBe("/billing-accounts");
	});

	test("get billing account", async () => {
		const client = new BillingServiceRestApiRestClient(apiUrl, {
			logger: console.debug,
			fetcher: createIsomorphicNativeFetcher({
				retry: { retries: 0 },
				fetch: (input, init) =>
					undiciFetch(input, { ...init, dispatcher: mockAgent }),
			}),
		});
		const command = new GetBillingAccountCommand({
			billingAccountId: "1234",
		});

		await client.json(command);

		expect(bodySpy).toBeTruthy();
	});

	test("event stream yields each event with its data decoded", async () => {
		const client = new BillingServiceRestApiRestClient(apiUrl, {
			fetcher: createIsomorphicNativeFetcher({
				retry: { retries: 0 },
				fetch: (input, init) =>
					undiciFetch(input, { ...init, dispatcher: mockAgent }),
			}),
		});

		const stream = await client.stream(
			new StreamOperationEventsCommand({ operationId }),
		);

		expectTypeOf(stream).toEqualTypeOf<
			ReadableStream<ParsedStreamEvent<StreamOperationEventsCommandOutput>>
		>();

		const reader = stream.getReader();

		await expect(reader.read()).resolves.toStrictEqual({
			done: false,
			value: {
				type: "heartbeat",
				lastEventId: "",
				retry: undefined,
				data: { sequence: 1 },
			},
		});
		await expect(reader.read()).resolves.toEqual({
			done: true,
			value: undefined,
		});
	});
});
