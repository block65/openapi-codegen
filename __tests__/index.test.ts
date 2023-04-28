import { test } from '@jest/globals';
import {
  FindPetsCommand,
  findPetsCommand,
} from './fixtures/petstore/methods.js';
import { LegacyRestClient } from './legacy.js';
import { logger } from './logger.js';
import { NewClient } from './reference.js';

export const legacyClient = new LegacyRestClient({
  requestMethod() {
    return Promise.resolve(true);
  },
});

export const client = new NewClient({
  requestMethod() {
    return Promise.resolve(true);
  },
});

test('Legacy', async () => {
  const result = await legacyClient
    .send(
      findPetsCommand({
        query: {
          limit: '10',
          tags: ['tag1', 'tag2'],
        },
      }),
    )
    .catch(logger.error);

  expect(result).toBeTruthy();
});

test('Basic', async () => {
  const command = new FindPetsCommand({
    query: {
      limit: '10',
      tags: ['tag1', 'tag2'],
    },
  });

  const serialized = command.serialize();

  const result = await client.send(command).catch(logger.error);

  expect(result).toBeTruthy();
});
