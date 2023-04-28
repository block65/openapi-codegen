import { writeFile } from 'node:fs/promises';
import type { OpenAPIV3 } from 'openapi-types';
import { format } from 'prettier';
import { processOpenApiDocument } from '../lib/process-document.js';

export async function build(
  inputFile: string,
  outputDir: string,
  tags?: string[],
) {
  const apischema = (await import(inputFile, {
    assert: { type: 'json' },
  })) as { default: OpenAPIV3.Document };

  const { entryFile, typesFile, clientFile } = await processOpenApiDocument(
    outputDir,
    apischema.default,
    tags,
  );

  entryFile.formatText();
  typesFile.formatText();
  clientFile.formatText();

  await entryFile.save();
  await typesFile.save();
  await clientFile.save();

  await Promise.all(
    [entryFile, entryFile].map((file) =>
      writeFile(
        file.getFilePath(),
        format(entryFile.getText(), { parser: 'typescript' }),
      ),
    ),
  );
}
