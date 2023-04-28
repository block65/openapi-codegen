import { test } from '@jest/globals';
import { findPetsCommand } from './fixtures/petstore/commands.js';
import { LegacyRestClient } from './legacy.js';
import { logger } from './logger.js';

export const legacyClient = new LegacyRestClient({
  requestMethod() {
    return Promise.resolve(true);
  },
});

test('FindPets (Legacy)', async () => {
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
