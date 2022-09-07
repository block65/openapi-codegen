import { describe, test } from '@jest/globals';
import { logger } from '../lib/logger.js';
import { listPets } from './fixtures/petstore/methods.js';
import { ReferenceServiceClient } from './reference.js';

export const client = new ReferenceServiceClient({
  requestMethod() {
    return Promise.resolve();
  },
});

describe('Basic', () => {
  test('Nothing', async () => {
    const result = await client
      .send(
        listPets({
          query: {
            limit: 10,
          } as any,
        }),
      )
      .catch(logger.error);

    expect(result).toBeTruthy();
  });
});
