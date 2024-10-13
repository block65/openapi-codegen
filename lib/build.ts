import { writeFile } from 'node:fs/promises';
import prettierConfig from '@block65/eslint-config/prettier';
import type { oas31 } from 'openapi3-ts';
import { format as prettier } from 'prettier';
import { processOpenApiDocument } from './process-document.js';

export async function build(
  inputFile: string,
  outputDir: string,
  tags?: string[],
) {
  const apischema = (await import(inputFile, {
    with: { type: 'json' },
  })) as { default: oas31.OpenAPIObject };

  const banner = `
  /**
   * This file was auto generated by @block65/openapi-codegen
   *
   * WARN: Do not edit directly.
   *
   * Generated on ${new Date().toISOString()}
   *
  */`.trim();

  const { commandsFile, typesFile, mainFile } = await processOpenApiDocument(
    outputDir,
    apischema.default,
    tags,
  );

  const files = [commandsFile, typesFile, mainFile];

  commandsFile.insertStatements(0, '/** eslint-disable max-classes */');

  // eslint-disable-next-line no-restricted-syntax
  for await (const file of files) {
    file.insertStatements(0, banner);
    file.formatText();

    await file.save();

    const data = await prettier(file.getFullText(), {
      parser: 'typescript',
      ...prettierConfig,
    });
    await writeFile(file.getFilePath(), data);
  }
}
