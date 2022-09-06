import { ESLint } from 'eslint';
import type { OpenAPIV3 } from 'openapi-types';
import { IndentationText, Project, QuoteKind, ScriptTarget } from 'ts-morph';
import { processOpenApiDocument } from '../lib/process-doc.js';
import apischema from './fixtures/openapi3.json' assert { type: 'json' };

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

const entryFile = project.createSourceFile(
  './__tests__/fixtures/generated/methods.ts',
  '',
  {
    overwrite: true,
  },
);

const typesFile = project.createSourceFile(
  './__tests__/fixtures/generated/types.d.ts',
  '',
  {
    overwrite: true,
  },
);

export const doc = apischema as OpenAPIV3.Document;

await processOpenApiDocument(entryFile, typesFile, doc);

entryFile.formatText();
typesFile.formatText();

await entryFile.save();
await typesFile.save();

const eslint = new ESLint({
  cwd: process.cwd(),
});
console.log({ eslint });

const results = await eslint
  .lintFiles(['./__tests__/fixtures/generated/methods.ts'])
  .catch((err) => {
    console.error(err);
    return [];
  });

console.log({ results });

console.log(ESLint.getErrorResults(results));
await ESLint.outputFixes(results);
