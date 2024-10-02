/* eslint-disable no-console */
import type { OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';
import {
  Writers,
  type CodeBlockWriter,
  type EnumDeclaration,
  type InterfaceDeclaration,
  type JSDocStructure,
  type OptionalKind,
  type PropertySignatureStructure,
  type SourceFile,
  type TypeAliasDeclaration,
  type WriterFunction,
} from 'ts-morph';
import {
  isNotNullOrUndefined,
  isNotReferenceObject,
  isReferenceObject,
  pascalCase,
  wordWrap,
} from './utils.js';

function maybeWithNullUnion(type: string | WriterFunction, withNull = false) {
  return withNull && type !== 'null' ? Writers.unionType(type, 'null') : type;
}

/**
 * @deprecated
 */
function schemaTypeIsNull(schema: OpenAPIV3_1.SchemaObject) {
  return schema.type === 'null';
}

function maybeUnion(...types: (string | WriterFunction)[]) {
  const [first, second, ...rest] = types;

  if (typeof first === 'undefined') {
    return 'never';
  }

  return typeof second === 'undefined'
    ? first
    : Writers.unionType(first, second, ...rest);
}

function maybeIntersection(...types: (string | WriterFunction)[]) {
  const [first, second, ...rest] = types;

  if (typeof first === 'undefined') {
    return 'never';
  }

  return typeof second === 'undefined'
    ? first
    : Writers.intersectionType(first, second, ...rest);
}

export function schemaToType(
  typesAndInterfaces: Map<
    string,
    InterfaceDeclaration | TypeAliasDeclaration | EnumDeclaration
  >,
  parentSchema: OpenAPIV3_1.SchemaObject,
  propertyName: string,
  schemaObject: OpenAPIV3_1.SchemaObject | OpenAPIV3_1.ReferenceObject,
  options: {
    exactOptionalPropertyTypes?: boolean;
    booleanAsStringish?: boolean;
    integerAsStringish?: boolean;
  } = {},
): OptionalKind<PropertySignatureStructure> {
  const name = `"${propertyName}"`;
  const hasQuestionToken =
    parentSchema.type === 'object' &&
    !parentSchema.required?.includes(propertyName);

  if ('$ref' in schemaObject) {
    const existingSchema = typesAndInterfaces.get(schemaObject.$ref);

    if (!existingSchema) {
      // throw new Error(`ref used before available: ${schemaObject.$ref}`);
      console.warn(`ref used before available: ${schemaObject.$ref}`);
      return {
        name,
        hasQuestionToken,
        type: 'never',
        docs: [
          {
            description: `WARN: $ref used before available - ${schemaObject.$ref}`,
          },
        ],
      };
    }

    return {
      name,
      hasQuestionToken,
      type: existingSchema.getName(),
    };
  }

  if (Array.isArray(schemaObject.type)) {
    const gah = schemaObject.type
      .filter((t): t is OpenAPIV3_1.NonArraySchemaObjectType => t !== 'array')
      .map((type) =>
        schemaToType(
          typesAndInterfaces,
          parentSchema,
          propertyName,
          { ...schemaObject, type },
          options,
        ),
      )
      .map((type) => type.type)
      .filter(
        <T>(type: T | undefined): type is T => typeof type !== 'undefined',
      );

    return {
      name,
      hasQuestionToken,
      type: maybeUnion(...gah),
    };
  }

  const jsdocTags = [
    ...(schemaObject.default
      ? [{ tagName: 'default', text: String(schemaObject.default) }]
      : []),
    ...(schemaObject.enum
      ? [{ tagName: 'enum', text: schemaObject.enum.join(',') }]
      : []),
    ...(schemaObject.externalDocs
      ? [
          {
            tagName: 'see',
            text: wordWrap(
              [
                schemaObject.externalDocs.description,
                schemaObject.externalDocs.url,
              ]
                .filter(Boolean)
                .join(' - '),
            ),
          },
        ]
      : []),
    ...(schemaObject.example
      ? [{ tagName: 'example', text: String(schemaObject.example) }]
      : []),
    ...(schemaObject.deprecated ? [{ tagName: 'deprecated' }] : []),
  ];

  const maybeJsDoc = {
    ...(schemaObject.description && {
      description: wordWrap(`\n${schemaObject.description}`),
    }),
    ...(jsdocTags.length > 0 && { tags: jsdocTags }),
  };

  const docs: (OptionalKind<JSDocStructure> | string)[] =
    Object.keys(maybeJsDoc).length > 1 ? [maybeJsDoc] : [];

  if (schemaObject.type === 'array') {
    const type = schemaToType(
      typesAndInterfaces,
      schemaObject,
      propertyName,
      schemaObject.items || {},
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
        docs,
      };
    }

    return {
      name,
      hasQuestionToken,
      type: `${type.type}[]`,
      isReadonly: true,
      docs,
    };
  }

  if (
    'allOf' in schemaObject ||
    'oneOf' in schemaObject ||
    'anyOf' in schemaObject
  ) {
    const schemaItems =
      schemaObject.allOf || schemaObject.oneOf || schemaObject.anyOf || [];

    const types = schemaItems
      .map((schema) =>
        schemaToType(typesAndInterfaces, parentSchema, propertyName, schema, {
          // forcibly disallow undefined, we will handle it later
          exactOptionalPropertyTypes: true,
        }),
      )
      .map((t) => t.type);

    // only one type, so just return that type
    if (types.length === 1 && types[0]) {
      return {
        name,
        hasQuestionToken,
        type: types[0],
        docs,
      };
    }

    const intersect = 'allOf' in schemaObject;

    // already got a null type, no need to add another null
    if (types.some((t) => t === 'null')) {
      return {
        name,
        hasQuestionToken,
        type: intersect
          ? maybeIntersection(...types.filter(isNotNullOrUndefined))
          : maybeUnion(...types.filter(isNotNullOrUndefined)),
        docs,
      };
    }

    // add null
    return {
      name,
      hasQuestionToken,
      type: intersect
        ? maybeIntersection(...types.filter(isNotNullOrUndefined), 'null')
        : maybeUnion(...types.filter(isNotNullOrUndefined), 'null'),
      docs,
    };
  }

  if (schemaObject.type === 'object') {
    // type=object and enum null is common openapi workaround
    // we convert it to null type
    if (schemaObject.enum?.every((e) => e === null)) {
      return {
        name,
        hasQuestionToken,
        type: 'null',
        docs,
      };
    }

    if (!schemaObject.properties) {
      return {
        name,
        hasQuestionToken,
        type: 'JsonifiableObject',
        docs,
      };
    }

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
      docs,
    };
  }

  if (schemaObject.type === 'integer' || schemaObject.type === 'number') {
    return {
      name,
      hasQuestionToken,
      type: maybeWithNullUnion(
        // eslint-disable-next-line no-template-curly-in-string
        options.integerAsStringish ? '`${number}`' : 'number',
        schemaTypeIsNull(schemaObject),
      ),
      docs,
    };
  }

  if (schemaObject.type === 'boolean') {
    return {
      name,
      hasQuestionToken,
      type: maybeWithNullUnion(
        options.booleanAsStringish
          ? Writers.unionType('"true"', '"false"')
          : 'boolean',
        schemaTypeIsNull(schemaObject),
      ),
      docs,
    };
  }

  if (schemaObject.type === 'string') {
    if ('enum' in schemaObject) {
      return {
        name,
        hasQuestionToken,
        type: maybeUnion(...schemaObject.enum.map((e) => JSON.stringify(e))),
        docs,
      };
    }

    if ('const' in schemaObject) {
      return {
        name,
        hasQuestionToken,
        type: Array.isArray(schemaObject.const)
          ? maybeUnion(...schemaObject.const)
          : JSON.stringify(schemaObject.const),

        docs,
      };
    }

    return {
      name,
      hasQuestionToken,
      type: 'string',
      docs,
    };
  }

  // empty schemaObject
  if (Object.keys(schemaObject).length === 0) {
    return {
      name,
      hasQuestionToken,
      type: maybeWithNullUnion('Jsonifiable', schemaTypeIsNull(schemaObject)),
      docs,
    };
  }

  if (Array.isArray(schemaObject.type)) {
    //
    if (schemaObject.type.length === 1) {
      return {
        name,
        hasQuestionToken,
        type: maybeWithNullUnion(
          schemaObject.type[0] || 'never',
          schemaTypeIsNull(schemaObject),
        ),
        docs,
      };
    }

    return {
      name,
      hasQuestionToken,
      type: maybeUnion(
        ...schemaObject.type.map((schemaStr) => {
          const schema =
            schemaStr === 'array'
              ? ({
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {},
                  },
                } satisfies OpenAPIV3_1.ArraySchemaObject)
              : ({
                  type: schemaStr,
                } satisfies OpenAPIV3_1.NonArraySchemaObject);

          return (
            schemaToType(typesAndInterfaces, schemaObject, name, schema).type ||
            'never'
          );
        }),
      ),
      docs,
    };
  }

  console.warn(
    'WARN: unhandled type %s in %j', // with parent %j',
    schemaObject.type,
    schemaObject,
    // parentSchema,
  );

  return {
    name,
    hasQuestionToken,
    type: 'unknown',
    docs,
  };
}

export function registerTypesFromSchema(
  typesAndInterfaces: Map<
    string,
    InterfaceDeclaration | TypeAliasDeclaration | EnumDeclaration
  >,
  typesFile: SourceFile,
  schemaName: string,
  schemaObject:
    | OpenAPIV3.SchemaObject
    | OpenAPIV3.ReferenceObject
    | OpenAPIV3_1.SchemaObject
    | OpenAPIV3_1.ReferenceObject,
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
      .filter((schema) => schema.type === 'object')
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
      )
      .filter(isNotNullOrUndefined);

    const nonObjectTypesFromNonRefSchemas = schemaItems
      .filter(isNotReferenceObject)
      .filter((schema) => schema.type !== 'object')
      .map(
        (subSchemaObject) =>
          schemaToType(
            typesAndInterfaces,
            {}, // no parent schema
            schemaName,
            subSchemaObject,
          ).type,
      )
      .filter(isNotNullOrUndefined);

    // concat and dedupe
    const typeArgs = [
      ...new Set([
        ...typeAliases.map((t) => t.getName()),
        ...objectTypesFromNonRefSchemas,
        ...nonObjectTypesFromNonRefSchemas,
      ]),
    ];

    const writerType = intersect ? Writers.intersectionType : Writers.unionType;

    // gets around picky types for writerType
    const [firstType = 'never', secondType, ...restTypes] = typeArgs;

    const typeAlias = typesFile.addTypeAlias({
      name: pascalCase(schemaName),
      isExported: true,
      type: secondType
        ? writerType.call(Writers, firstType, secondType, ...restTypes)
        : firstType,
    });

    if (schemaObject.description) {
      typeAlias.addJsDoc({
        description: wordWrap(schemaObject.description),
      });
    }

    typesAndInterfaces.set(`#/components/schemas/${schemaName}`, typeAlias);
  }

  // deal with objects
  else if (!schemaObject.type || schemaObject.type === 'object') {
    const newIf = typesFile.addTypeAlias({
      name: pascalCase(schemaName),
      isExported: true,
      // WARN: Duplicated code - the recursion beat me
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
    });

    if (schemaObject.description) {
      newIf.addJsDoc({
        description: wordWrap(schemaObject.description),
      });
    }

    typesAndInterfaces.set(`#/components/schemas/${schemaName}`, newIf);
  }

  // deal with enums
  else if (schemaObject.type === 'string' && schemaObject.enum) {
    const enumDeclaration = typesFile.addEnum({
      name: pascalCase(schemaName, 'Enum'),
      isExported: true,
      members: schemaObject.enum.map((e: unknown) => ({
        name: typeof e === 'string' ? pascalCase(e) : String(e),
        value: String(e),
      })),
    });

    const docs = schemaObject.description
      ? [
          {
            description: wordWrap(schemaObject.description),
          },
        ]
      : [];

    const stringUnion = typesFile.addTypeAlias({
      name: pascalCase(schemaName, schemaObject.type),
      isExported: true,
      type: maybeUnion(...schemaObject.enum.map((e) => JSON.stringify(e))),
      docs,
    });

    // additional interface for the sam,e enum as a string union
    typesAndInterfaces.set(
      `#/components/schemas/${schemaName}String`,
      stringUnion,
    );

    // default
    typesAndInterfaces.set(
      `#/components/schemas/${schemaName}`,
      enumDeclaration,
    );
  }

  // deal with string consts
  else if (schemaObject.type === 'string' && 'const' in schemaObject) {
    const constDeclaration = typesFile.addTypeAlias({
      isExported: true,
      name: pascalCase(schemaName),
      type: JSON.stringify(schemaObject.const),
    });

    if (schemaObject.description) {
      constDeclaration.addJsDoc({
        description: wordWrap(schemaObject.description),
      });
    }

    typesAndInterfaces.set(
      `#/components/schemas/${schemaName}`,
      constDeclaration,
    );
  }

  // deal with non-enum strings
  else if (schemaObject.type === 'string' && !schemaObject.enum) {
    const typeAlias = typesFile.addTypeAlias({
      name: pascalCase(schemaName),
      isExported: true,
      type: maybeWithNullUnion(
        schemaObject.format === 'date-time' ? 'Jsonify<Date>' : 'string',
        schemaTypeIsNull(schemaObject),
      ),
    });

    if (schemaObject.description) {
      typeAlias.addJsDoc({
        description: wordWrap(schemaObject.description),
      });
    }

    typesAndInterfaces.set(`#/components/schemas/${schemaName}`, typeAlias);
  }

  // deal with numberish things
  else if (schemaObject.type === 'number' || schemaObject.type === 'integer') {
    const typeAlias = typesFile.addTypeAlias({
      name: pascalCase(schemaName),
      isExported: true,
      type: maybeWithNullUnion(
        schemaObject.type,
        schemaTypeIsNull(schemaObject),
      ),
    });

    if (schemaObject.description) {
      typeAlias.addJsDoc({
        description: wordWrap(schemaObject.description),
      });
    }

    typesAndInterfaces.set(`#/components/schemas/${schemaName}`, typeAlias);
  }

  // deal with boolean things
  else if (schemaObject.type === 'boolean') {
    const typeAlias = typesFile.addTypeAlias({
      name: pascalCase(schemaName),
      isExported: true,
      type: maybeWithNullUnion(
        schemaObject.type,
        schemaTypeIsNull(schemaObject),
      ),
    });

    if (schemaObject.description) {
      typeAlias.addJsDoc({
        description: wordWrap(schemaObject.description),
      });
    }

    typesAndInterfaces.set(`#/components/schemas/${schemaName}`, typeAlias);
  }

  // deal with arrays of refs
  else if (
    schemaObject.type === 'array' &&
    schemaObject.items &&
    '$ref' in schemaObject.items
  ) {
    const iface = typesAndInterfaces.get(schemaObject.items.$ref);

    if (!iface) {
      throw new Error(`ref used before available: ${schemaObject.items.$ref}`);
    }

    const typeAlias = typesFile.addTypeAlias({
      name: pascalCase(schemaName),
      isExported: true,
      type: `${iface.getName()}[]`,
    });

    if (schemaObject.description) {
      typeAlias.addJsDoc({
        description: wordWrap(schemaObject.description),
      });
    }

    typesAndInterfaces.set(`#/components/schemas/${schemaName}`, typeAlias);
  }

  // not supported yet
  else {
    console.warn(`unsupported type "${schemaObject.type}"`);
    // throw new Error(`unsupported type "${schemaObject.type}"`);
  }
}
