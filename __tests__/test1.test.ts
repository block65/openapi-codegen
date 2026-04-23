import { MockAgent, setGlobalDispatcher } from "undici";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import {
	GetBillingAccountCommand,
	ListBillingAccountsCommand,
} from "./fixtures/test1/commands.ts";
import { BillingServiceRestApiRestClient } from "./fixtures/test1/main.ts";

const mockAgent = new MockAgent();

beforeAll(() => {
	mockAgent.activate();
	mockAgent.disableNetConnect();
	setGlobalDispatcher(mockAgent);
});

afterAll(() => {
	mockAgent.assertNoPendingInterceptors();
});

mockAgent.disableNetConnect();
// setGlobalDispatcher(mockAgent);
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
		});
		const command = new GetBillingAccountCommand({
			billingAccountId: "1234",
		});

		await client.json(command);

		expect(bodySpy).toBeTruthy();
	});
});
