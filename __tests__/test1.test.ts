import { test } from '@jest/globals';
import {
  GetBillingAccountCommand,
  LinkBillingAccountCommand,
  UpdateBillingAccountCommand,
} from './fixtures/test1/commands.js';
import { BillingServiceRestApiRestClient } from './fixtures/test1/main.js';
import { BillingCountry, type BillingAccount } from './fixtures/test1/types.js';

const test1Client = new BillingServiceRestApiRestClient(
  new URL('http://invalid'),
);

test('command that will result in a void response', async () => {
  const command = new LinkBillingAccountCommand({
    accountId: '1234',
    billingAccountId: '5678',
  });

  try {
    const res = await test1Client.json(command);

    // @ts-expect-error
    const typeTest: void = res;
  } catch (err) {
    console.log(Object(err).message);
  }
});

test('command without a body', async () => {
  const command = new GetBillingAccountCommand({
    billingAccountId: '5678',
  });

  try {
    const res: BillingAccount = await test1Client.json(command);

    const billingAccountId: string = res.billingAccountId;
  } catch (err) {
    console.log(Object(err).message);
  }
});

test('command with a body', async () => {
  const command = new UpdateBillingAccountCommand({
    billingAccountId: '5678',
    country: BillingCountry.Sg,
  });

  try {
    const res = await test1Client.json(command);
    // @ts-expect-error
    const billingAccountId: string = res.billingAccountId;
  } catch (err) {
    console.log(Object(err).message);
  }
});
