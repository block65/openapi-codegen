import { writeFile } from 'node:fs/promises';
import type { OpenAPIV3 } from 'openapi-types';
import { format } from 'prettier';
import { processOpenApiDocument } from './process-document.js';

export async function build(
  inputFile: string,
  outputDir: string,
  tags?: string[],
) {
  const apischema = (await import(inputFile, {
    with: { type: 'json' },
  })) as { default: OpenAPIV3.Document };

  const banner = `
  /**
   * This file is auto generated by @block65/openapi-codegen
   *
   * WARN: Do not edit directly.
   *
   * Generated on ${new Date().toISOString()}
   *
  */`.trim();

  const { commandsFile, typesFile, clientFile } = await processOpenApiDocument(
    outputDir,
    apischema.default,
    tags,
  );

  commandsFile.insertStatements(0, banner);
  typesFile.insertStatements(0, banner);
  clientFile.insertStatements(0, banner);

  commandsFile.formatText();
  typesFile.formatText();
  clientFile.formatText();

  await commandsFile.save();
  await typesFile.save();
  await clientFile.save();

  await Promise.all(
    [commandsFile, commandsFile].map(async (file) =>
      writeFile(
        file.getFilePath(),
        await format(commandsFile.getText(), { parser: 'typescript' }),
      ),
    ),
  );
}
