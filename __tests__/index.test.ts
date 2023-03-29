import { describe, test } from '@jest/globals';
import { logger } from './logger.js';
import { findPetsCommand } from './fixtures/petstore/methods.js';
import { ReferenceServiceClient } from './reference.js';

export const client = new ReferenceServiceClient({
  requestMethod() {
    return Promise.resolve(true);
  },
});

describe('Basic', () => {
  test('Nothing', async () => {
    const result = await client
      .send(
        findPetsCommand({
          query: {
            // limit: 10,
          },
        }),
      )
      .catch(logger.error);

    expect(result).toBeTruthy();
  });
});
