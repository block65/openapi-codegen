import camelcase from 'camelcase';
import type { OpenAPIV3 } from 'openapi-types';
import {
  InterfaceDeclaration,
  SourceFile,
  TypeAliasDeclaration,
  Writers,
} from 'ts-morph';
import {
  isNotReferenceObject,
  isReferenceObject,
  pascalCase,
  refToName,
} from './utils.js';

export function processSchemaObject(
  typesAndInterfaces: Map<string, InterfaceDeclaration | TypeAliasDeclaration>,
  typesFile: SourceFile,
  schemaName: string,
  schemaObject: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject,
) {
  if ('$ref' in schemaObject) {
    const iface = typesAndInterfaces.get(schemaObject.$ref);

    if (!iface) {
      throw new Error(`ref used before available: ${schemaObject.$ref}`);
    }

    const typeAlias = typesFile.addTypeAlias({
      name: refToName(schemaObject.$ref),
      isExported: true,
      type: iface.getName(),
    });

    typesAndInterfaces.set(`#/components/schemas/${schemaName}`, typeAlias);
  } else if (
    'allOf' in schemaObject ||
    'oneOf' in schemaObject ||
    'anyOf' in schemaObject
  ) {
    const schemas =
      schemaObject.allOf || schemaObject.oneOf || schemaObject.anyOf || [];

    const union = 'allOf' in schemaObject;
    const typeAliases = schemas.filter(isReferenceObject).map((s) => {
      const alias = typesAndInterfaces.get(s.$ref);
      if (!alias) {
        throw new Error(`ref used before available: ${s.$ref}`);
      }
      return alias;
    });

    const objectTypesFromNonRefSchemas = schemas
      .filter(isNotReferenceObject)
      .map((s: OpenAPIV3.SchemaObject) =>
        Writers.objectType({
          properties: Object.entries(s.properties || {}).map(
            ([name, prop]) => ({
              name: camelcase(name),
              type: '$ref' in prop ? 'never' : prop.type || 'never',
            }),
          ),
        }),
      );

    const writerType = union
      ? Writers.unionType.bind(Writers)
      : Writers.intersectionType.bind(Writers);

    const typeAlias = typesFile.addTypeAlias({
      name: pascalCase(schemaName),
      isExported: true,
      type: writerType(
        // @ts-expect-error -> bad type in ts-morph (arguably)
        ...typeAliases.map((t) => t.getName()),
        ...objectTypesFromNonRefSchemas,
      ),
    });

    typesAndInterfaces.set(`#/components/schemas/${schemaName}`, typeAlias);
  } else if (schemaObject.type === 'object') {
    const newIf = typesFile.addInterface({
      name: schemaName,
      isExported: true,
      properties: Object.entries(schemaObject.properties || {}).map(
        ([k, p]) => {
          const name = camelcase(k);

          if ('$ref' in p) {
            const existingSchema = typesAndInterfaces.get(p.$ref);

            if (!existingSchema) {
              throw new Error(`ref used before available: ${p.$ref}`);
            }

            return {
              name,
              type: existingSchema.getName(),
            };
          }

          return {
            name,
            type: p.type || 'never',
          };
        },
      ),
    });

    typesAndInterfaces.set(`#/components/schemas/${schemaName}`, newIf);
  } else if (schemaObject.type === 'string') {
    const typeAlias = typesFile.addTypeAlias({
      name: pascalCase(schemaName),
      isExported: true,
      type: 'string',
    });

    typesAndInterfaces.set(`#/components/schemas/${schemaName}`, typeAlias);
  } else if (schemaObject.type === 'number') {
    const typeAlias = typesFile.addTypeAlias({
      name: pascalCase(schemaName),
      isExported: true,
      type: 'number',
    });

    typesAndInterfaces.set(`#/components/schemas/${schemaName}`, typeAlias);
  } else {
    throw new Error('unsupported');
  }
}
