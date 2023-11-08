import { test } from '@jest/globals';
import { processOpenApiDocument } from '../lib/process-document.js';

test('nullables', async () => {
  const result = await processOpenApiDocument(
    '/tmp', // if we dont call .save() it doesnt matter
    {
      openapi: '3.0.0',
      info: {
        title: 'Test',
        version: '1.0.0',
      },
      paths: {},
      components: {
        schemas: {
          MySchemaLolOrNullable: {
            oneOf: [
              {
                type: 'string',
                enum: ['lol', 'kek'],
              },
              {
                nullable: true,
              },
            ],
          },
        },
      },
    },
    [],
  );

  expect(result.typesFile.getText()).toMatchSnapshot();
});
