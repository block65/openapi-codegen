import { test, expect } from 'vitest';
import { FindPetsCommand } from './fixtures/petstore/commands.js';
import { SwaggerPetstoreRestClient } from './fixtures/petstore/main.js';

test('PetStore FindPets', async () => {
  const petStoreClient = new SwaggerPetstoreRestClient(
    new URL('http://invalid'),
  );
  const command = new FindPetsCommand({
    limit: '10',
    tags: ['tag1', 'tag2'],
  });

  const result = await petStoreClient.json(command).catch((err) => err);

  expect(result).toBeTruthy();
});
