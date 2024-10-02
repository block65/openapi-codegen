import { test, expect } from 'vitest';
import { CreateModerationCommand } from './fixtures/openai/commands.js';
import { OpenAiApiRestClient } from './fixtures/openai/main.js';

test('OpenAI CreateModeration', async () => {
  const openAiClient = new OpenAiApiRestClient(new URL('http://invalid'));

  const command = new CreateModerationCommand({
    input: 'This is a test',
  });

  const result = await openAiClient.json(command).catch((err) => err);

  expect(result).toBeTruthy();
});
