import { test } from '@jest/globals';
import { GetBillingAccountCommand } from './fixtures/test1/commands.js';
import { BillingServiceRestApiRestClient } from './fixtures/test1/main.js';

test('Test1 GetBillingAccount', async () => {
  const client = new BillingServiceRestApiRestClient(new URL('http://invalid'));
  const command = new GetBillingAccountCommand({
    billingAccountId: '1234',
  });

  const result = await client.json(command).catch((err) => err);

  expect(result).toBeTruthy();
});
