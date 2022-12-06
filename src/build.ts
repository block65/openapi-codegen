import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { OpenAPIV3 } from 'openapi-types';
import { format } from 'prettier';
import { IndentationText, Project, QuoteKind, ScriptTarget } from 'ts-morph';
import { processOpenApiDocument } from '../lib/process-document.js';

export async function build(
  inputFile: string,
  outputDir: string,
  tags?: string[],
) {
  const apischema = (await import(inputFile, {
    assert: { type: 'json' },
  })) as { default: OpenAPIV3.Document };

  const project = new Project({
    compilerOptions: {
      target: ScriptTarget.ES2022,
      declaration: true,
    },
    manipulationSettings: {
      quoteKind: QuoteKind.Single,
      indentationText: IndentationText.TwoSpaces,
      useTrailingCommas: true,
    },
  });

  const banner = `
  /**
   * This file is auto generated.
   *
   * WARN: Do not edit directly.
   *
   * Generated on ${new Date().toISOString()}
   *
  */`.trim();

  const entryFile = project.createSourceFile(
    join(outputDir, 'methods.ts'),
    banner,
    {
      overwrite: true,
    },
  );

  const typesFile = project.createSourceFile(
    join(outputDir, 'models.ts'),
    banner,
    {
      overwrite: true,
    },
  );

  await processOpenApiDocument(entryFile, typesFile, apischema.default, tags);

  entryFile.formatText();
  typesFile.formatText();

  await entryFile.save();
  await typesFile.save();

  await Promise.all(
    [entryFile, entryFile].map((file) =>
      writeFile(
        file.getFilePath(),
        format(entryFile.getText(), { parser: 'typescript' }),
      ),
    ),
  );
}
