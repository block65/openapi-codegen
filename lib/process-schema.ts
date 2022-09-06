import camelcase from 'camelcase';
import type $RefParser from 'json-schema-ref-parser';
import type { OpenAPIV3 } from 'openapi-types';
import {
  EnumDeclaration,
  InterfaceDeclaration,
  OptionalKind,
  PropertySignatureStructure,
  SourceFile,
  TypeAliasDeclaration,
  Writers,
} from 'ts-morph';
import {
  isNotReferenceObject,
  isReferenceObject,
  pascalCase,
} from './utils.js';

function withNullUnion(type: string, nullable = false) {
  return nullable ? Writers.unionType(type, 'null') : type;
}

function schemaToType(
  typesAndInterfaces: Map<
    string,
    InterfaceDeclaration | TypeAliasDeclaration | EnumDeclaration
  >,
  parentSchema: OpenAPIV3.SchemaObject,
  propertyName: string,
  schemaObject: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject,
): OptionalKind<PropertySignatureStructure> {
  const name = camelcase(propertyName);
  const hasQuestionToken = !parentSchema.required?.includes(propertyName);

  if ('$ref' in schemaObject) {
    const existingSchema = typesAndInterfaces.get(schemaObject.$ref);

    if (!existingSchema) {
      throw new Error(`ref used before available: ${schemaObject.$ref}`);
    }

    return {
      name,
      hasQuestionToken,
      type: existingSchema.getName(),
    };
  }

  if (schemaObject.type === 'array') {
    const type = schemaToType(
      typesAndInterfaces,
      schemaObject,
      propertyName,
      schemaObject.items,
    );

    return {
      name,
      hasQuestionToken,
      type: `${type.type}[]`,
    };

    // if ('$ref' in propertySchema.items) {
    //   const existingSchema = typesAndInterfaces.get(propertySchema.items.$ref);

    //   if (!existingSchema) {
    //     throw new Error(
    //       `ref used before available: ${propertySchema.items.$ref}`,
    //     );
    //   }

    //   return {
    //     name,
    //     hasQuestionToken,
    //     type: `${withNullUnion(
    //       existingSchema.getName(),
    //       'nullable' in propertySchema && propertySchema.nullable,
    //     )}[]`,
    //   };
    // }

    // return {
    //   name,
    //   hasQuestionToken,
    //   type: withNullUnion(
    //     'never',
    //     'nullable' in propertySchema && propertySchema.nullable,
    //   ),
    // };
  }

  if (schemaObject.type === 'integer') {
    return {
      name,
      hasQuestionToken,
      type: withNullUnion(
        'number',
        'nullable' in schemaObject && schemaObject.nullable,
      ),
    };
  }

  if (schemaObject.type === 'object') {
    return {
      name,
      hasQuestionToken,
      // WARN: Duplicated code - recursion beat me
      type: Writers.objectType({
        properties: Object.entries(schemaObject.properties || {}).map(
          ([propertyName, propertySchema]) => {
            const type = schemaToType(
              typesAndInterfaces,
              schemaObject,
              propertyName,
              propertySchema,
            );

            return type;
          },
        ),
      }),
    };
  }

  return {
    name,
    hasQuestionToken,
    type: withNullUnion(
      schemaObject.type === 'string' && schemaObject.format?.includes('date')
        ? 'Date'
        : schemaObject.type?.toString() || 'never',
      'nullable' in schemaObject && schemaObject.nullable,
    ),
  };
}

export function registerTypesFromSchema(
  typesAndInterfaces: Map<
    string,
    InterfaceDeclaration | TypeAliasDeclaration | EnumDeclaration
  >,
  typesFile: SourceFile,
  schemaName: string,
  schemaObject: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject,
  _refs: $RefParser.$Refs,
) {
  // deal with refs
  if ('$ref' in schemaObject) {
    const iface = typesAndInterfaces.get(schemaObject.$ref);

    if (!iface) {
      throw new Error(`ref used before available: ${schemaObject.$ref}`);
    }

    const typeAlias = typesFile.addTypeAlias({
      name: schemaName,
      isExported: true,
      type: iface.getName(),
    });

    typesAndInterfaces.set(`#/components/schemas/${schemaName}`, typeAlias);
  }

  // deal with unions and intersections
  else if (
    'allOf' in schemaObject ||
    'oneOf' in schemaObject ||
    'anyOf' in schemaObject
  ) {
    const schemaItems =
      schemaObject.allOf || schemaObject.oneOf || schemaObject.anyOf || [];

    const union = 'allOf' in schemaObject;

    const typeAliases = schemaItems.filter(isReferenceObject).map((s) => {
      const alias = typesAndInterfaces.get(s.$ref);
      if (!alias) {
        throw new Error(`ref used before available: ${s.$ref}`);
      }
      return alias;
    });

    const objectTypesFromNonRefSchemas = schemaItems
      .filter(isNotReferenceObject)
      .map((subSchemaObject) =>
        Writers.objectType({
          properties: Object.entries(subSchemaObject.properties || {}).map(
            ([propertyName, propertySchema]) =>
              schemaToType(
                typesAndInterfaces,
                subSchemaObject,
                propertyName,
                propertySchema,
              ),
          ),
        }),
      );

    const writerType = union
      ? Writers.intersectionType.bind(Writers)
      : Writers.unionType.bind(Writers);

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
  }

  // deal with objects
  else if (!schemaObject.type || schemaObject.type === 'object') {
    const newIf = typesFile.addTypeAlias({
      name: schemaName,
      isExported: true,
      // WARN: Duplicated code - recursion beat me
      type: Writers.objectType({
        properties: Object.entries(schemaObject.properties || {}).map(
          ([propertyName, propertySchema]) => {
            const type = schemaToType(
              typesAndInterfaces,
              schemaObject,
              propertyName,
              propertySchema,
            );

            return type;
          },
        ),
      }),

      // properties: Object.entries(schemaObject.properties || {}).map(
      //   ([propertyName, propertySchema]) =>
      //     schemaToType(
      //       typesAndInterfaces,
      //       schemaObject,
      //       propertyName,
      //       propertySchema,
      //     ),
      // ),
    });

    typesAndInterfaces.set(`#/components/schemas/${schemaName}`, newIf);
  }

  // deal with non-enum strings
  else if (schemaObject.type === 'string' && !schemaObject.enum) {
    const typeAlias = typesFile.addTypeAlias({
      name: pascalCase(schemaName),
      isExported: true,
      type: withNullUnion(
        schemaObject.format?.includes('date') ? 'Date' : 'string',
        schemaObject.nullable,
      ),
    });

    typeAlias.addJsDoc({
      description: schemaObject.description || '',
    });

    typesAndInterfaces.set(`#/components/schemas/${schemaName}`, typeAlias);
  }

  // deal with enums strings
  else if (schemaObject.type === 'string' && schemaObject.enum) {
    const enumDeclaration = typesFile.addEnum({
      name: pascalCase(schemaName),
      isExported: true,
      members: schemaObject.enum.map((e: string) => ({
        name: pascalCase(e),
        value: e,
      })),
    });

    enumDeclaration.addJsDoc({
      description: schemaObject.description || '',
    });

    typesAndInterfaces.set(
      `#/components/schemas/${schemaName}`,
      enumDeclaration,
    );
  }

  // deal with numberish things
  else if (schemaObject.type === 'number' || schemaObject.type === 'integer') {
    const typeAlias = typesFile.addTypeAlias({
      name: pascalCase(schemaName),
      isExported: true,
      type: withNullUnion('number', schemaObject.nullable),
    });

    typesAndInterfaces.set(`#/components/schemas/${schemaName}`, typeAlias);
  }

  // not supported yet
  else {
    throw new Error(`unsupported ${schemaObject.type}`);
  }
}
