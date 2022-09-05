import type { OpenAPIV3 } from 'openapi-types';
import { Project, ScriptTarget } from 'ts-morph';
import { processOpenApiDocument } from '../lib/process-doc.js';
import apischema from './fixtures/openapi3.json' assert { type: 'json' };

const project = new Project({
  compilerOptions: {
    target: ScriptTarget.ES2022,
    declaration: true,
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
