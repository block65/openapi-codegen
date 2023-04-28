import { test } from '@jest/globals';
import { CreateModerationCommand } from './fixtures/openai/commands.js';
import { OpenAiApiRestClient } from './fixtures/openai/main.js';
import { FindPetsCommand } from './fixtures/petstore/commands.js';
import { SwaggerPetstoreRestClient } from './fixtures/petstore/main.js';
import { logger } from './logger.js';

export const petStoreClient = new SwaggerPetstoreRestClient();
export const openAiClient = new OpenAiApiRestClient();

test('PetStore FindPets', async () => {
  const command = new FindPetsCommand({
    limit: '10',
    tags: ['tag1', 'tag2'],
  });

  const result = await petStoreClient.send(command).catch(logger.error);

  expect(result).toBeTruthy();
});

test('PetStore FindPets', async () => {
  const command = new CreateModerationCommand({
    input: 'This is a test',
  });

  const result = await openAiClient.send(command).catch(logger.error);

  expect(result).toBeTruthy();
});
