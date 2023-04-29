import { test } from '@jest/globals';
import { CreateModerationCommand } from './fixtures/openai/commands.js';
import { OpenAiApiRestClient } from './fixtures/openai/main.js';
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

test('OpenAI CreateModeration', async () => {
  const openAiClient = new OpenAiApiRestClient(new URL('http://invalid'));

  const command = new CreateModerationCommand({
    input: 'This is a test',
  });

  const result = await openAiClient.json(command).catch((err) => err);

  expect(result).toBeTruthy();
});
