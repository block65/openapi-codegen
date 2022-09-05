import {
  createNodeFetchRequestMethod,
  RestServiceClient,
} from '@block65/rest-client';
import { describe, test } from '@jest/globals';
import { listCompetitionResultsCommand } from './fixtures/generated/methods.js';

export const client = new RestServiceClient({
  id: 'test',
  requestMethod: createNodeFetchRequestMethod(),
});

describe('Basic', () => {
  test('Nothing', async () => {
    const result = await client
      .send(listCompetitionResultsCommand, 'test1', 'test2', {
        order: 'asc',
        sort: 'name',
        page: 1,
        perPage: 25,
      })
      .catch(console.error);

    expect(result).toBeTruthy();
  });
});
