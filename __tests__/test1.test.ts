import { MockAgent, fetch as undiciFetch } from "undici";
import { describe, expect, test, vi } from "vitest";
import {
	GetBillingAccountCommand,
	ListBillingAccountsCommand,
} from "./fixtures/test1/commands.ts";
import { BillingServiceRestApiRestClient } from "./fixtures/test1/main.ts";

const mockAgent = new MockAgent();
mockAgent.disableNetConnect();

const apiUrl = "http://192.2.0.1";

describe("Test1", () => {
	const pool = mockAgent.get(apiUrl);

	const bodySpy = vi.fn((_body: string) => ({ ok: true }));

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

	test("zero-input command has correct pathname", () => {
		const command = new ListBillingAccountsCommand();
		expect(command.pathname).toBe("/billing-accounts");
	});

	test("get billing account", async () => {
		const client = new BillingServiceRestApiRestClient(apiUrl, {
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
		const command = new GetBillingAccountCommand({
			billingAccountId: "1234",
		});

		await client.json(command);

		expect(bodySpy).toBeTruthy();
	});
});
