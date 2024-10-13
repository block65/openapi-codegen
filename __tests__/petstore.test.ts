import { MockAgent, setGlobalDispatcher } from 'undici';
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import { FindPetsCommand } from './fixtures/petstore/commands.js';
import { SwaggerPetstoreRestClient } from './fixtures/petstore/main.js';

const mockAgent = new MockAgent();
setGlobalDispatcher(mockAgent);

beforeAll(() => {
  mockAgent.activate();
  mockAgent.disableNetConnect();
});

afterAll(() => {
  mockAgent.assertNoPendingInterceptors();
});

mockAgent.disableNetConnect();
const apiUrl = 'http://192.2.0.1';

describe('Petstore', () => {
  const pool = mockAgent.get(apiUrl);

  const bodySpy = vi.fn(() => ({ ok: true }));

  pool
    .intercept({
      path: '/pets?tags=tag1%2Ctag2&limit=10',
      // query: { limit: '10', tags: ['tag1', 'tag2'] },
      method: 'GET',
      body(body) {
        bodySpy(body);
        return true;
      },
    })
    .reply(200, { ok: 1 })
    .times(1);

  test('find pets', async () => {
    const petStoreClient = new SwaggerPetstoreRestClient(apiUrl, {
      logger: console.log,
    });
    const command = new FindPetsCommand({
      limit: '10',
      tags: ['tag1', 'tag2'],
    });

    const result = await petStoreClient.json(command).catch((err) => err);

    expect(result).toBeTruthy();
  });
});
