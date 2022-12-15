import camelcase from 'camelcase';
import type $RefParser from 'json-schema-ref-parser';
import type { OpenAPIV3 } from 'openapi-types';
import {
  CodeBlockWriter,
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

export function schemaToType(
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

    if (type.type instanceof Function) {
      const typeWriter = type.type;
      return {
        name,
        hasQuestionToken,
        type: (writer: CodeBlockWriter) => {
          writer.write('Array<');
          typeWriter(writer);
          writer.write('>');
        },
      };
    }

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

  if (
    'allOf' in schemaObject ||
    'oneOf' in schemaObject ||
    'anyOf' in schemaObject
  ) {
    const schemaItems =
      schemaObject.allOf || schemaObject.oneOf || schemaObject.anyOf || [];

    const intersect = 'allOf' in schemaObject;

    const types = schemaItems
      .map((schema) =>
        schemaToType(typesAndInterfaces, parentSchema, propertyName, schema),
      )
      .map((t) => t.type);

    const nullable = 'nullable' in schemaObject && schemaObject.nullable;

    // not nullable, and only one type, so just return that type
    if (!nullable && types.length === 1 && types[0]) {
      return {
        name,
        hasQuestionToken,
        type: types[0],
      };
    }

    // already got a nullable type, no need to add null
    if (types.some((t) => t === 'null')) {
      return {
        name,
        hasQuestionToken,
        type: intersect
          ? // @ts-expect-error -> bad type in ts-morph (arguably)
            Writers.intersectionType(...types)
          : // @ts-expect-error -> bad type in ts-morph (arguably)
            Writers.unionType(...types),
      };
    }

    // add null
    return {
      name,
      hasQuestionToken,
      type: intersect
        ? // @ts-expect-error -> bad type in ts-morph (arguably)
          Writers.intersectionType(...types, 'null')
        : // @ts-expect-error -> bad type in ts-morph (arguably)
          Writers.unionType(...types, 'null'),
    };
  }

  if (schemaObject.type === 'object') {
    return {
      name,
      hasQuestionToken,
      // WARN: Duplicated code - recursion beat me
      type: Writers.objectType({
        properties: Object.entries(schemaObject.properties || {}).map(
          ([schemaPropertyName, schemaPropertySchema]) => {
            const type = schemaToType(
              typesAndInterfaces,
              schemaObject,
              schemaPropertyName,
              schemaPropertySchema,
            );

            return type;
          },
        ),
      }),
    };
  }

  const type =
    schemaObject.type === 'string' && schemaObject.format?.includes('date')
      ? 'Date'
      : schemaObject.type?.toString() || 'never';

  if (type === 'never') {
    console.warn('WARNING: unknown type', schemaObject);
  }

  return {
    name,
    hasQuestionToken,
    type: withNullUnion(
      type,
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
      name: pascalCase(schemaName),
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

    const intersect = 'allOf' in schemaObject;

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

    const writerType = intersect
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
      name: pascalCase(schemaName),
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

  // deal with boolean things
  else if (schemaObject.type === 'boolean') {
    const typeAlias = typesFile.addTypeAlias({
      name: pascalCase(schemaName),
      isExported: true,
      type: withNullUnion('boolean', schemaObject.nullable),
    });

    typesAndInterfaces.set(`#/components/schemas/${schemaName}`, typeAlias);
  }

  // deal with arrays of refs
  else if (schemaObject.type === 'array' && '$ref' in schemaObject.items) {
    const iface = typesAndInterfaces.get(schemaObject.items.$ref);

    if (!iface) {
      throw new Error(`ref used before available: ${schemaObject.items.$ref}`);
    }

    const typeAlias = typesFile.addTypeAlias({
      name: pascalCase(schemaName),
      isExported: true,
      type: `${iface.getName()}[]`,
    });

    typesAndInterfaces.set(`#/components/schemas/${schemaName}`, typeAlias);
  }

  // not supported yet
  else {
    throw new Error(`unsupported ${schemaObject.type}`);
  }
}
